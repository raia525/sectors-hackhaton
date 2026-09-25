import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSessionToken, parseSessionToken, SHORT_SESSION_HOURS, REMEMBER_SESSION_DAYS } from "./session";

describe("session token signing and parsing", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "a-test-secret-of-sixteen-plus-characters";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = originalSecret;
  });

  it("round trips a freshly built token", () => {
    const { token } = buildSessionToken("user-123", false);
    expect(parseSessionToken(token)).toBe("user-123");
  });

  it("gives a remembered session a longer lifetime than a short one", () => {
    const remembered = buildSessionToken("user-123", true);
    const short = buildSessionToken("user-123", false);
    expect(remembered.maxAgeSeconds).toBe(REMEMBER_SESSION_DAYS * 24 * 60 * 60);
    expect(short.maxAgeSeconds).toBe(SHORT_SESSION_HOURS * 60 * 60);
    expect(remembered.maxAgeSeconds).toBeGreaterThan(short.maxAgeSeconds);
  });

  it("rejects a token with a tampered payload", () => {
    const { token } = buildSessionToken("user-123", false);
    const tampered = token.replace("user-123", "user-999");
    expect(parseSessionToken(tampered)).toBeNull();
  });

  it("rejects a token with a tampered signature", () => {
    const { token } = buildSessionToken("user-123", false);
    const lastChar = token.at(-1);
    const flipped = lastChar === "0" ? "1" : "0";
    const tampered = token.slice(0, -1) + flipped;
    expect(parseSessionToken(tampered)).toBeNull();
  });

  it("rejects an expired token even with a valid signature", () => {
    // Builds the token by hand with an expiry in the past, the same shape
    // buildSessionToken produces, to test expiry without waiting real time.
    const issuedAt = Date.now() - 1000;
    const expires = Date.now() - 500;
    const payload = `user-123.${issuedAt}.${expires}`;
    const signature = createHmac("sha256", process.env.AUTH_SECRET!).update(payload).digest("hex");
    const token = `${payload}.${signature}`;
    expect(parseSessionToken(token)).toBeNull();
  });

  it("rejects an empty or malformed token", () => {
    expect(parseSessionToken(undefined)).toBeNull();
    expect(parseSessionToken("")).toBeNull();
    expect(parseSessionToken("not-a-real-token")).toBeNull();
  });

  it("produces different signatures for different secrets", () => {
    const { token } = buildSessionToken("user-123", false);
    process.env.AUTH_SECRET = "a-completely-different-secret-value";
    expect(parseSessionToken(token)).toBeNull();
  });
});
