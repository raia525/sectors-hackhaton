import { describe, expect, it } from "vitest";
import { escapeHtml, renderDigestEmail } from "./email";
import { msg } from "@/lib/i18n/message";
import type { Alert } from "./rules";

function alert(over: Partial<Alert> = {}): Alert {
  return {
    kind: "DIVERGENCE",
    symbol: "BBRI",
    title: msg("alert.divergenceTitle", {
      symbol: "BBRI",
      magnitude: "4.2",
      direction: msg("alert.direction.above"),
    }),
    body: [
      msg("alert.divergenceSummary", {
        symbol: "BBRI",
        magnitude: "4.2",
        direction: msg("alert.direction.above"),
        peerCount: 5,
        zScore: "2.60",
      }),
    ],
    priority: 2.6,
    payload: {},
    ...over,
  };
}

describe("escapeHtml", () => {
  it("escapes every character that could break out of a text node", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("a & b")).toBe("a &amp; b");
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("escapes ampersands before other entities, so escaping is not doubled", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("renderDigestEmail", () => {
  it("escapes alert content rather than trusting it as markup", () => {
    // Company names and API text reach this template through a Message's
    // parameters; treating them as HTML would be an injection vector.
    const rendered = renderDigestEmail("en", null, {
      alerts: [
        alert({
          title: msg("alert.actionTitle", {
            symbol: "BBRI",
            summary: msg("actions.freeTextDetail", {
              text: `<img src=x onerror="alert(1)">`,
            }),
            date: "2026-01-01",
          }),
          body: [msg("actions.freeTextDetail", { text: `<script>steal()</script>` })],
        }),
      ],
      omitted: 0,
    });

    // The property that matters is that no tag or attribute is created, not
    // that the substring is absent: escaped text legitimately still reads
    // "onerror=" inside an inert, fully escaped string.
    expect(rendered.html).not.toContain("<script>steal()");
    expect(rendered.html).not.toContain("<img");
    expect(rendered.html).not.toMatch(/onerror\s*=\s*"[^&]/);
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("escapes the recipient name", () => {
    const rendered = renderDigestEmail("en", `<b>Rai</b>`, {
      alerts: [alert()],
      omitted: 0,
    });
    expect(rendered.html).toContain("&lt;b&gt;Rai&lt;/b&gt;");
  });

  it("uses the single alert as the subject, and a count for several", () => {
    const one = renderDigestEmail("en", null, { alerts: [alert()], omitted: 0 });
    expect(one.subject).toMatch(/BBRI is trading 4\.2% above its twin/);

    const many = renderDigestEmail("en", null, {
      alerts: [alert(), alert({ symbol: "BBCA" })],
      omitted: 0,
    });
    expect(many.subject).toMatch(/2 stocks/);
  });

  it("always produces a plain text alternative", () => {
    const rendered = renderDigestEmail("en", "Rai", { alerts: [alert()], omitted: 0 });
    expect(rendered.text).toMatch(/BBRI is trading 4\.2% above its twin/);
    expect(rendered.text).not.toContain("<table");
  });

  it("states how many alerts were left out of the digest", () => {
    const rendered = renderDigestEmail("en", null, { alerts: [alert()], omitted: 3 });
    expect(rendered.html).toMatch(/3 further alerts were not included/);
    expect(rendered.text).toMatch(/3 further alerts were not included/);
  });

  it("carries the disclaimer in both formats", () => {
    const rendered = renderDigestEmail("en", null, { alerts: [alert()], omitted: 0 });
    expect(rendered.html).toMatch(/not investment advice/);
    expect(rendered.text).toMatch(/not investment advice/);
  });

  it("renders in Indonesian when given the id locale", () => {
    const rendered = renderDigestEmail("id", null, { alerts: [alert()], omitted: 0 });
    expect(rendered.html).toMatch(/bukan saran investasi/);
    expect(rendered.text).toMatch(/bukan saran investasi/);
  });
});
