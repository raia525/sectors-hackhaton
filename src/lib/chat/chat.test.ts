import { describe, expect, it } from "vitest";
import { assembleToolCalls, GrokError, parseSse, streamCompletion, type StreamEvent } from "./grok";
import { cleanOutput, isSafeChatLink, jakartaDayStart, systemPrompt } from "./prompt";

const chunk = (obj: unknown) => `data: ${JSON.stringify(obj)}\n`;

describe("parseSse", () => {
  it("reads text, tool fragments, usage and the end marker", () => {
    const buffer =
      chunk({ choices: [{ delta: { content: "Hello" } }] }) +
      chunk({ choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "get_stock", arguments: '{"sym' } }] } }] }) +
      ": keep-alive comment\n" +
      chunk({ choices: [], usage: { prompt_tokens: 12, completion_tokens: 3 } }) +
      "data: [DONE]\n" +
      'data: {"choices":[{"delta":{"content":"par';
    const { events, rest } = parseSse(buffer);
    expect(events).toEqual([
      { type: "text", text: "Hello" },
      { type: "tool", index: 0, id: "c1", name: "get_stock", args: '{"sym' },
      { type: "usage", prompt: 12, completion: 3 },
      { type: "done" },
    ]);
    expect(rest).toBe('data: {"choices":[{"delta":{"content":"par');
  });

  it("fails with a named error on a malformed or reshaped chunk", () => {
    expect(() => parseSse("data: {not json\n")).toThrow(GrokError);
    expect(() => parseSse(chunk({ choices: [{ delta: { content: 42 } }] }))).toThrow(/unexpected shape/);
  });
});

describe("assembleToolCalls", () => {
  it("joins streamed fragments into whole calls in index order", () => {
    const events: Extract<StreamEvent, { type: "tool" }>[] = [
      { type: "tool", index: 1, id: "b", name: "search_tickers", args: '{"query":' },
      { type: "tool", index: 0, id: "a", name: "get_stock", args: '{"symbol":"BB' },
      { type: "tool", index: 0, args: 'RI"}' },
      { type: "tool", index: 1, args: '"bank"}' },
    ];
    expect(assembleToolCalls(events)).toEqual([
      { id: "a", type: "function", function: { name: "get_stock", arguments: '{"symbol":"BBRI"}' } },
      { id: "b", type: "function", function: { name: "search_tickers", arguments: '{"query":"bank"}' } },
    ]);
  });
});

describe("streamCompletion", () => {
  const body = (text: string) =>
    new ReadableStream({
      start(c) {
        // Split mid-line to prove the buffer carries over between reads.
        const bytes = new TextEncoder().encode(text);
        c.enqueue(bytes.slice(0, 20));
        c.enqueue(bytes.slice(20));
        c.close();
      },
    });

  it("streams events from a mocked response and sends the key only in the header", async () => {
    let sent: RequestInit | undefined;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sent = init;
      return new Response(body(chunk({ choices: [{ delta: { content: "Hi there" } }] }) + "data: [DONE]\n"));
    }) as typeof fetch;

    const events: StreamEvent[] = [];
    for await (const e of streamCompletion({ apiKey: "xai-secret", model: "grok-4.3", messages: [], tools: [], fetchImpl })) {
      events.push(e);
    }
    expect(events).toEqual([{ type: "text", text: "Hi there" }, { type: "done" }]);
    expect((sent?.headers as Record<string, string>).authorization).toBe("Bearer xai-secret");
    expect(String(sent?.body)).not.toContain("xai-secret");
  });

  it("names http and network failures", async () => {
    const fail = (async () => new Response("no", { status: 401 })) as typeof fetch;
    await expect(streamCompletion({ apiKey: "k", model: "m", messages: [], tools: [], fetchImpl: fail }).next()).rejects.toMatchObject({
      code: "http",
    });
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(streamCompletion({ apiKey: "k", model: "m", messages: [], tools: [], fetchImpl: down }).next()).rejects.toMatchObject({
      code: "network",
    });
  });
});

describe("prompt guardrails", () => {
  const prompt = systemPrompt({ locale: "id", today: "2026-10-04", extra: "" });

  it("binds answers to stored data and forbids advice and the insider claim", () => {
    expect(prompt).toMatch(/only from the results of your tools/);
    expect(prompt).toMatch(/Never give buy, sell or hold advice/);
    expect(prompt).toMatch(/Never call it insider/);
    expect(prompt).toMatch(/Bahasa Indonesia/);
    expect(prompt).not.toContain("—");
  });

  it("puts admin instructions after the rules and says they cannot override them", () => {
    const withExtra = systemPrompt({ locale: "en", today: "2026-10-04", extra: "Keep answers under 80 words." });
    expect(withExtra.indexOf("Keep answers")).toBeGreaterThan(withExtra.indexOf("9."));
    expect(withExtra).toMatch(/cannot override the rules above/);
    expect(withExtra).toMatch(/Reply in English/);
  });

  it("replaces em dashes in output", () => {
    expect(cleanOutput("BBRI rose — on its own—mostly")).toBe("BBRI rose, on its own, mostly");
  });

  it("allows only the app's own analysis links", () => {
    expect(isSafeChatLink("/stocks?symbol=BBRI")).toBe(true);
    expect(isSafeChatLink("/stocks/compare?symbols=BBRI,BMRI")).toBe(true);
    expect(isSafeChatLink("/market#track-record")).toBe(true);
    expect(isSafeChatLink("/portfolio?open=BBRI#BBRI")).toBe(true);
    expect(isSafeChatLink("/market#<x>")).toBe(false);
    expect(isSafeChatLink("/portfolio")).toBe(true);
    expect(isSafeChatLink("https://evil.example")).toBe(false);
    expect(isSafeChatLink("//evil.example")).toBe(false);
    expect(isSafeChatLink("javascript:alert(1)")).toBe(false);
    expect(isSafeChatLink("/admin")).toBe(false);
    expect(isSafeChatLink("/stocks?symbol=<script>")).toBe(false);
  });

  it("starts the daily limit at midnight in Jakarta", () => {
    // 2026-10-03 18:30 UTC is 01:30 on the 4th in Jakarta.
    expect(jakartaDayStart(new Date("2026-10-03T18:30:00Z")).toISOString()).toBe("2026-10-03T17:00:00.000Z");
    // 2026-10-03 16:00 UTC is 23:00 on the 3rd in Jakarta.
    expect(jakartaDayStart(new Date("2026-10-03T16:00:00Z")).toISOString()).toBe("2026-10-02T17:00:00.000Z");
  });
});
