import type { TranslationKey } from "./dictionary";

/**
 * A translatable message: a dictionary key plus the values to interpolate
 * into it.
 *
 * The analysis engines (shadow, smartmoney, reality-check, corporate-actions,
 * seasonality, notification rules) produce findings and caveats that were
 * previously assembled as finished English sentences. That made them
 * untranslatable without duplicating the engines' conditional logic in the UI
 * layer.
 *
 * Returning a Message instead keeps the decision of *which* sentence applies
 * inside the engine, where the reasoning already lives and is tested, while
 * deferring *how it reads* to the render layer, which has the current locale.
 * A component renders one with `t(msg.key, msg.params)`, or with
 * `renderMessage` when a parameter is itself a translated word.
 */
export interface Message {
  key: TranslationKey;
  params?: TranslateParams;
}

/**
 * A parameter value is a plain number/string, formatted by the caller, or a
 * nested Message for the "one translated word inside another translated
 * sentence" case (see renderMessage).
 */
export type TranslateParams = Record<string, string | number | Message>;

export function msg(key: TranslationKey, params?: TranslateParams): Message {
  return { key, params };
}

/**
 * Renders a Message, resolving each parameter that is itself a Message
 * before interpolating it into the outer template.
 *
 * This exists because some sentences embed one translated word inside
 * another translated sentence, for example "Coverage leans {tone} and...".
 * The engine that builds the outer message does not know the viewer's
 * locale, so it cannot resolve "positive" to "positif" itself; it passes the
 * inner word as its own Message, and this function resolves both, inside
 * out, in whichever locale `t` is bound to.
 */
export function renderMessage(
  message: Message,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
): string {
  if (!message.params) return t(message.key);

  const resolved: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(message.params)) {
    resolved[name] =
      typeof value === "object" ? t(value.key, resolveFlat(value.params)) : value;
  }
  return t(message.key, resolved);
}

/** Flattens one level of nested Message params; engine messages never nest deeper than this. */
function resolveFlat(
  params: TranslateParams | undefined,
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  const flat: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(params)) {
    flat[name] = typeof value === "object" ? value.key : value;
  }
  return flat;
}
