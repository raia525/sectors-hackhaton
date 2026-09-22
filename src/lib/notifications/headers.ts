/**
 * Header safety checks for outgoing mail.
 *
 * Kept apart from the mailer so it can be tested directly. The mailer imports
 * `server-only`, which by design cannot be loaded outside a server component,
 * and that guard is worth more than the convenience of one file.
 */

/**
 * Detects CR or LF, the characters that make header injection possible.
 *
 * A newline in a recipient or subject lets an attacker terminate the header and
 * append their own, including extra recipients. These values are ours rather
 * than user supplied, but the check costs nothing and removes the question.
 */
export function hasHeaderBreak(value: string): boolean {
  return /[\r\n]/.test(value);
}
