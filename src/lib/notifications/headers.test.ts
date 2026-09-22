import { describe, expect, it } from "vitest";
import { hasHeaderBreak } from "./headers";

/**
 * Header injection is the one failure in the mail path that turns a bug into a
 * security problem: a newline in a recipient or subject lets an attacker append
 * arbitrary SMTP headers, including extra recipients.
 *
 * The transport itself is not unit tested here. Asserting that nodemailer was
 * called with the right object would test a mock of our own making rather than
 * that mail is delivered, which is verified by running the job against a real
 * relay instead.
 */

describe("hasHeaderBreak", () => {
  it("accepts ordinary values", () => {
    expect(hasHeaderBreak("rai@example.com")).toBe(false);
    expect(hasHeaderBreak("BBRI is trading 4.2% above its twin")).toBe(false);
    expect(hasHeaderBreak("")).toBe(false);
  });

  it("rejects the characters that allow header injection", () => {
    expect(hasHeaderBreak("a@b.com\nBcc: victim@example.com")).toBe(true);
    expect(hasHeaderBreak("a@b.com\r\nBcc: victim@example.com")).toBe(true);
    expect(hasHeaderBreak("subject\rwith carriage return")).toBe(true);
  });

  it("rejects a break anywhere in the value, not only at the start", () => {
    expect(hasHeaderBreak("perfectly normal subject\n")).toBe(true);
    expect(hasHeaderBreak("\nleading")).toBe(true);
  });
});
