import { describe, expect, it } from "vitest";
import { checkTokenValidity } from "./tokens";

const now = new Date("2026-01-01T00:00:00Z");

function record(over: Partial<{ purpose: string; usedAt: Date | null; expiresAt: Date }> = {}) {
  return {
    purpose: "EMAIL_VERIFY",
    usedAt: null,
    expiresAt: new Date("2026-01-02T00:00:00Z"),
    ...over,
  };
}

describe("checkTokenValidity", () => {
  it("is invalid when there is no record", () => {
    expect(checkTokenValidity(null, "EMAIL_VERIFY", now)).toBe("invalid");
  });

  it("is invalid when the purpose does not match", () => {
    expect(checkTokenValidity(record({ purpose: "PASSWORD_RESET" }), "EMAIL_VERIFY", now)).toBe(
      "invalid",
    );
  });

  it("is invalid when the token has already been used", () => {
    expect(
      checkTokenValidity(record({ usedAt: new Date("2025-12-31T00:00:00Z") }), "EMAIL_VERIFY", now),
    ).toBe("invalid");
  });

  it("is expired when the expiry has passed, even with a matching purpose and unused token", () => {
    expect(
      checkTokenValidity(record({ expiresAt: new Date("2025-12-31T00:00:00Z") }), "EMAIL_VERIFY", now),
    ).toBe("expired");
  });

  it("is valid for a matching, unused, unexpired token", () => {
    expect(checkTokenValidity(record(), "EMAIL_VERIFY", now)).toBe("valid");
  });

  it("treats the exact expiry instant as still valid, and a moment after as expired", () => {
    expect(checkTokenValidity(record({ expiresAt: now }), "EMAIL_VERIFY", now)).toBe("valid");
    expect(
      checkTokenValidity(record({ expiresAt: now }), "EMAIL_VERIFY", new Date(now.getTime() + 1)),
    ).toBe("expired");
  });
});
