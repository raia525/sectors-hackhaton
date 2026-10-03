import type { Message } from "@/lib/i18n/message";

/**
 * What a form's server action returns: a message to show, either a
 * confirmation or an error. Messages, not strings, so they render in the
 * viewer's language.
 */
export interface FormState {
  ok?: Message;
  error?: Message;
}
