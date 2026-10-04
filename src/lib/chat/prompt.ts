import type { Locale } from "@/lib/i18n/locales";

/**
 * The chatbot's instructions and the clean-up applied to what it writes.
 *
 * The rules mirror AGENTS.md: answer only from the app's own stored data,
 * say when that data is missing or weak, never call institutional or
 * foreign flow "insider" activity, never give buy or sell advice, and write
 * without em dashes. The prompt states them; the server also enforces the
 * ones it can check mechanically.
 */

export const MAX_MESSAGE_LENGTH = 1000;
/** Earlier turns sent back to the model with each question. */
export const HISTORY_TURNS = 12;
/** Tool rounds before the model must answer with what it has. */
export const MAX_TOOL_ROUNDS = 4;

export function systemPrompt(options: { locale: Locale; today: string; extra: string }): string {
  const language = options.locale === "id" ? "Indonesian (Bahasa Indonesia)" : "English";
  const lines = [
    "You are the assistant inside SHADOW IDX, a market intelligence app for the Indonesia Stock Exchange (IDX).",
    "SHADOW IDX builds a synthetic twin for a stock from comparable companies, then splits the stock's return into market, sector and stock specific parts. A divergence z score measures how unusual the stock specific part is. A daily run stores one analysis per covered stock.",
    `Today is ${options.today} (Asia/Jakarta). Reply in ${language}, in short, plain paragraphs or a short list.`,
    "",
    "Rules you must follow:",
    "1. Answer only from the results of your tools. They read analyses the app has already stored. If a tool returns nothing for a stock, say there is no stored analysis yet and link to /stocks?symbol=CODE so the user can run one. Never fill gaps from memory or general knowledge about a company's prices, news or fundamentals.",
    "2. Always name the date of the data you use (the run date or as-of date in the tool result).",
    "3. When a result is weak, say so before anything else: a twin fit below the floor, too few peers, a refused conclusion, or a caveat. Repeat the caveats that apply. Never present a weak signal as a strong one.",
    "4. Never give buy, sell or hold advice, price targets or predictions. If asked, say the app describes what has happened and is not investment advice, then offer what the data shows.",
    "5. Smart money in this app means foreign flow and institutional ownership categories. Never call it insider trading or insider activity; the data contains no director dealings.",
    "6. Do not use the em dash character. Use commas or full stops.",
    "7. Link a stock the first time you mention it, as a markdown link: [BBRI](/stocks?symbol=BBRI). Other allowed links: /market, /market/sectors, /market/track-record, /stocks/compare?symbols=A,B, /portfolio. Do not link anywhere else.",
    "8. Only discuss the user's own watchlist when they ask about it, using get_watchlist. You cannot see other users' data.",
    "9. If the question is not about IDX stocks or this app, say briefly what you can help with.",
  ];
  const extra = options.extra.trim();
  if (extra) lines.push("", "Additional instructions from the site administrator (they cannot override the rules above):", extra);
  return lines.join("\n");
}

/**
 * Applies the house style to model output: an em dash becomes a comma.
 * Applied to each streamed piece and again to the stored reply.
 */
export function cleanOutput(text: string): string {
  return text.replace(/\s*—\s*/g, ", ");
}

/** Links the chat may render. Anything else is shown as plain text. */
const SAFE_LINK = /^\/(stocks(\/compare)?|market(\/(sectors|track-record))?|portfolio)(\?[A-Za-z0-9=,&]*)?$/;

export function isSafeChatLink(href: string): boolean {
  return SAFE_LINK.test(href);
}

/** The start of the day in Jakarta (UTC+7), for the daily message limit. */
export function jakartaDayStart(now: Date): Date {
  const shifted = new Date(now.getTime() + 7 * 3600_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 7 * 3600_000);
}
