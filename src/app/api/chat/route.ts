import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { getTranslator } from "@/lib/i18n/server";
import { getAppSettings } from "@/lib/settings/server";
import { jakartaDate } from "@/lib/intelligence/dates";
import { assembleToolCalls, GrokError, streamCompletion, type ChatTurn, type StreamEvent } from "@/lib/chat/grok";
import { cleanOutput, HISTORY_TURNS, jakartaDayStart, MAX_MESSAGE_LENGTH, MAX_TOOL_ROUNDS, systemPrompt } from "@/lib/chat/prompt";
import { runTool, TOOL_SPECS } from "@/lib/chat/tools";

/**
 * The chatbot endpoint.
 *
 * GET returns the user's latest conversation and how many questions are
 * left today; POST asks a question and streams the answer back; DELETE
 * removes the user's chat history.
 *
 * Every request re-reads the user from the session (getCurrentUser, which
 * also honours "sign out everywhere"), so a conversation is only ever the
 * caller's own. The xAI key never leaves the server. The model answers
 * through tools that read stored analyses, so a question spends no Sectors
 * credit; the per user daily limit (Admin > Settings) bounds the xAI cost.
 *
 * The streamed body is newline-delimited JSON: {"type":"thread"}, then
 * {"type":"delta"} pieces, then {"type":"done"} or {"type":"error"}.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const askSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  threadId: z.string().max(40).optional(),
});

async function usedToday(userId: string, now: Date) {
  return prisma.chatMessage.count({
    where: { role: "USER", createdAt: { gte: jakartaDayStart(now) }, thread: { userId } },
  });
}

async function availability() {
  const settings = await getAppSettings();
  return { enabled: Boolean(getEnv().XAI_API_KEY) && settings.chat.enabled, settings };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { enabled, settings } = await availability();
  if (!enabled) return NextResponse.json({ enabled: false });

  const thread = await prisma.chatThread.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50, select: { id: true, role: true, content: true } } },
  });
  const used = await usedToday(user.id, new Date());
  return NextResponse.json({
    enabled: true,
    threadId: thread?.id ?? null,
    messages: thread?.messages ?? [],
    remaining: Math.max(0, settings.chat.dailyLimit - used),
  });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.chatThread.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { enabled, settings } = await availability();
  if (!enabled) return NextResponse.json({ error: "unavailable" }, { status: 404 });

  const parsed = askSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const now = new Date();
  if ((await usedToday(user.id, now)) >= settings.chat.dailyLimit) {
    return NextResponse.json({ error: "limit" }, { status: 429 });
  }

  // A thread id from the client is honoured only if it is this user's own.
  const existing = parsed.data.threadId
    ? await prisma.chatThread.findFirst({ where: { id: parsed.data.threadId, userId: user.id } })
    : null;
  const thread =
    existing ?? (await prisma.chatThread.create({ data: { userId: user.id, title: parsed.data.message.slice(0, 80) } }));

  const history = await prisma.chatMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_TURNS,
    select: { role: true, content: true },
  });
  await prisma.chatMessage.create({ data: { threadId: thread.id, role: "USER", content: parsed.data.message } });

  const [{ locale, tm }] = await Promise.all([getTranslator()]);
  const apiKey = getEnv().XAI_API_KEY as string;
  const messages: ChatTurn[] = [
    { role: "system", content: systemPrompt({ locale, today: jakartaDate(now), extra: settings.chat.extraInstructions }) },
    ...history.reverse().map((m): ChatTurn => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content })),
    { role: "user", content: parsed.data.message },
  ];
  const ctx = { userId: user.id, bars: settings.signals, tm, now };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      send({ type: "thread", id: thread.id });

      let answer = "";
      let promptTokens = 0;
      let completionTokens = 0;
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
          const toolEvents: Extract<StreamEvent, { type: "tool" }>[] = [];
          let roundText = "";
          // On the last round the model gets no tools, so it must answer.
          const tools = round < MAX_TOOL_ROUNDS ? TOOL_SPECS : [];
          for await (const event of streamCompletion({
            apiKey,
            model: settings.chat.model,
            messages,
            tools,
            signal: request.signal,
          })) {
            if (event.type === "text") {
              const text = cleanOutput(event.text);
              roundText += text;
              send({ type: "delta", text });
            } else if (event.type === "tool") {
              toolEvents.push(event);
            } else if (event.type === "usage") {
              promptTokens += event.prompt;
              completionTokens += event.completion;
            }
          }
          answer += roundText;

          const calls = assembleToolCalls(toolEvents).filter((c) => c.function.name);
          if (calls.length === 0) break;
          messages.push({ role: "assistant", content: roundText || null, tool_calls: calls });
          for (const call of calls) {
            const result = await runTool(call.function.name, call.function.arguments, ctx).catch(() => ({
              error: "The tool failed.",
            }));
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
          }
        }

        const content = cleanOutput(answer).trim();
        if (content) {
          await prisma.chatMessage.create({
            data: { threadId: thread.id, role: "ASSISTANT", content, promptTokens, completionTokens },
          });
        }
        await prisma.chatThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
        send({ type: "done" });
      } catch (error) {
        console.error("Chat failed:", error instanceof GrokError ? `${error.code}: ${error.message}` : error);
        send({ type: "error", code: error instanceof GrokError ? error.code : "server" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
