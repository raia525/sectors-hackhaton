import { z } from "zod";

/**
 * A minimal client for xAI's chat completions API (OpenAI compatible), with
 * no SDK: one fetch, a streamed response, and tool calls.
 *
 * Every chunk is validated with Zod at the boundary, like every other third
 * party response in the app (AGENTS.md, non-negotiable 5): an upstream shape
 * change ends the reply with a named error rather than leaking `undefined`
 * into the conversation.
 */

export const XAI_URL = "https://api.x.ai/v1/chat/completions";

export type ChatTurn =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

const chunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().nullish(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().nullish(),
                  function: z.object({ name: z.string().nullish(), arguments: z.string().nullish() }).nullish(),
                }),
              )
              .nullish(),
          })
          .nullish(),
        finish_reason: z.string().nullish(),
      }),
    )
    .default([]),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).nullish(),
});

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; index: number; id?: string; name?: string; args?: string }
  | { type: "usage"; prompt: number; completion: number }
  | { type: "done" };

export class GrokError extends Error {
  constructor(
    public code: "http" | "shape" | "network",
    message: string,
  ) {
    super(message);
    this.name = "GrokError";
  }
}

/**
 * Turns one server-sent-events buffer into events, returning the text left
 * over after the last complete line so the caller can prepend it to the
 * next network chunk. Pure, so the parsing is tested without a network.
 */
export function parseSse(buffer: string): { events: StreamEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (data === "[DONE]") {
      events.push({ type: "done" });
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      throw new GrokError("shape", "A stream chunk was not valid JSON.");
    }
    const parsed = chunkSchema.safeParse(json);
    if (!parsed.success) throw new GrokError("shape", "A stream chunk had an unexpected shape.");
    for (const choice of parsed.data.choices) {
      const delta = choice.delta;
      if (delta?.content) events.push({ type: "text", text: delta.content });
      for (const call of delta?.tool_calls ?? []) {
        events.push({
          type: "tool",
          index: call.index,
          id: call.id ?? undefined,
          name: call.function?.name ?? undefined,
          args: call.function?.arguments ?? undefined,
        });
      }
    }
    if (parsed.data.usage) {
      events.push({ type: "usage", prompt: parsed.data.usage.prompt_tokens, completion: parsed.data.usage.completion_tokens });
    }
  }
  return { events, rest };
}

/** Collects streamed tool call fragments into whole calls, in index order. */
export function assembleToolCalls(events: Extract<StreamEvent, { type: "tool" }>[]): ToolCall[] {
  const byIndex = new Map<number, ToolCall>();
  for (const e of events) {
    const call = byIndex.get(e.index) ?? { id: "", type: "function" as const, function: { name: "", arguments: "" } };
    if (e.id) call.id = e.id;
    if (e.name) call.function.name += e.name;
    if (e.args) call.function.arguments += e.args;
    byIndex.set(e.index, call);
  }
  return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, c]) => c);
}

/** Opens a streamed completion and yields its events. */
export async function* streamCompletion(options: {
  apiKey: string;
  model: string;
  messages: ChatTurn[];
  tools: ToolSpec[];
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): AsyncGenerator<StreamEvent> {
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(XAI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${options.apiKey}` },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        tools: options.tools,
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.2,
      }),
      signal: options.signal,
    });
  } catch {
    throw new GrokError("network", "The model could not be reached.");
  }
  if (!response.ok || !response.body) {
    throw new GrokError("http", `The model answered ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSse(buffer);
    buffer = rest;
    for (const event of events) yield event;
  }
  const { events } = parseSse(`${buffer}\n`);
  for (const event of events) yield event;
}
