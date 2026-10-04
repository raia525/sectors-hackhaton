"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { isSafeChatLink, MAX_MESSAGE_LENGTH } from "@/lib/chat/prompt";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { IconClose, IconSpark } from "./ui/icons";

/**
 * The floating chatbot, bottom right, on signed-in pages when it is switched
 * on and a key is configured (the layout decides; this only renders).
 *
 * Replies stream in as newline-delimited JSON from /api/chat. The model's
 * text is rendered through a tiny formatter that understands paragraphs,
 * "- " lists, **bold** and links, and turns a link into a real one only
 * when it points at one of the app's own analysis pages: anything else
 * stays plain text, so a reply can never send the reader off site.
 */

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

const SUGGESTIONS: TranslationKey[] = ["chat.suggest.market", "chat.suggest.watchlist", "chat.suggest.stock"];

const ERROR_KEY: Record<string, TranslationKey> = {
  limit: "chat.error.limit",
  unavailable: "chat.error.unavailable",
  http: "chat.error.model",
  network: "chat.error.model",
  shape: "chat.error.model",
  server: "chat.error.generic",
};

export function ChatWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // History is fetched the first time the panel opens, not on every page.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setLoaded(true);
        if (!data.enabled) return setError("chat.error.unavailable");
        setThreadId(data.threadId);
        setMessages(data.messages);
        setRemaining(data.remaining);
      })
      .catch(() => !cancelled && setError("chat.error.generic"));
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    const replyId = `reply-${Date.now()}`;
    setMessages((m) => [...m, { id: `ask-${Date.now()}`, role: "USER", content: text }, { id: replyId, role: "ASSISTANT", content: "" }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, threadId: threadId ?? undefined }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "server");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type: string; id?: string; text?: string; code?: string };
          if (event.type === "thread" && event.id) setThreadId(event.id);
          else if (event.type === "delta" && event.text) {
            setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, content: msg.content + event.text } : msg)));
          } else if (event.type === "error") throw new Error(event.code ?? "server");
        }
      }
      setRemaining((r) => (r === null ? r : Math.max(0, r - 1)));
    } catch (e) {
      const code = e instanceof Error ? e.message : "server";
      setError(ERROR_KEY[code] ?? "chat.error.generic");
      setMessages((m) => m.filter((msg) => !(msg.id === replyId && msg.content === "")));
    } finally {
      setBusy(false);
    }
  }

  async function clearHistory() {
    if (!window.confirm(t("chat.confirmClear"))) return;
    await fetch("/api/chat", { method: "DELETE" }).catch(() => undefined);
    setMessages([]);
    setThreadId(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? t("chat.close") : t("chat.open")}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent-bright text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 focus-visible:outline-offset-4"
      >
        {open ? <IconClose size={22} /> : <IconSpark size={22} />}
      </button>

      {open ? (
        <section
          id="chat-panel"
          aria-label={t("chat.title")}
          className="fixed inset-x-0 bottom-0 top-0 z-50 flex flex-col bg-surface sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-[var(--radius)] sm:border sm:border-border sm:shadow-[var(--shadow-card)]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-text">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <IconSpark size={14} />
                </span>
                {t("chat.title")}
              </h2>
              <p className="mt-1 text-xs text-text-subtle">{t("chat.subtitle")}</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 ? (
                <button type="button" onClick={clearHistory} className="rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-raised">
                  {t("chat.clear")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("chat.close")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-raised sm:hidden"
              >
                <IconClose size={16} />
              </button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">{t("chat.empty")}</p>
                <ul className="space-y-2">
                  {SUGGESTIONS.map((key) => (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => ask(t(key))}
                        disabled={busy}
                        className="w-full rounded-[var(--radius-sm)] border border-border px-3 py-2 text-left text-sm text-text transition-colors hover:border-accent"
                      >
                        {t(key)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m) =>
                m.role === "USER" ? (
                  <p key={m.id} className="ml-8 rounded-[var(--radius-sm)] bg-accent-soft px-3.5 py-2.5 text-sm text-text">
                    {m.content}
                  </p>
                ) : (
                  <div key={m.id} className="mr-4 space-y-2 text-sm leading-relaxed text-text">
                    {m.content ? <Formatted text={m.content} onNavigate={() => setOpen(false)} /> : <Typing label={t("chat.thinking")} />}
                  </div>
                ),
              )
            )}
            {error ? (
              <p role="alert" className="rounded-[var(--radius-sm)] bg-down/10 px-3 py-2 text-sm text-down">
                {t(error)}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="border-t border-border p-3"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">{t("chat.inputLabel")}</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(input);
                  }
                }}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={t("chat.placeholder")}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim() || remaining === 0}
                className="h-11 rounded-full bg-accent px-4 text-sm font-bold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {t("chat.send")}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-text-subtle">
              {remaining !== null ? `${t("chat.remaining", { count: remaining })} ` : ""}
              {t("chat.disclaimer")}
            </p>
          </form>
        </section>
      ) : null}
    </>
  );
}

function Typing({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-text-subtle" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </p>
  );
}

/** Paragraphs, "- " lists, **bold** and safe internal links. Nothing else. */
function Formatted({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""), onNavigate)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 ? <br /> : null}
                {inline(l, onNavigate)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function inline(text: string, onNavigate: () => void): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\[([^\]]{1,80})\]\(([^)\s]{1,200})\)|\*\*([^*]{1,200})\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[3]) {
      parts.push(<strong key={match.index}>{match[3]}</strong>);
    } else if (isSafeChatLink(match[2])) {
      parts.push(
        <Link key={match.index} href={match[2]} onClick={onNavigate} className="font-semibold text-accent underline underline-offset-2">
          {match[1]}
        </Link>,
      );
    } else {
      parts.push(match[1]);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
