import { describe, expect, it } from "vitest";
import { escapeHtml, renderDigestEmail } from "./email";
import type { Alert } from "./rules";

function alert(over: Partial<Alert> = {}): Alert {
  return {
    kind: "DIVERGENCE",
    symbol: "BBRI",
    title: "BBRI is trading 4.2% above its twin",
    body: "BBRI has moved beyond what its peers would predict.",
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
    // Company names and API text reach this template; treating them as HTML
    // would be an injection vector.
    const rendered = renderDigestEmail(null, {
      alerts: [
        alert({
          title: `<img src=x onerror="alert(1)">`,
          body: `<script>steal()</script>`,
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
    const rendered = renderDigestEmail(`<b>Rai</b>`, {
      alerts: [alert()],
      omitted: 0,
    });
    expect(rendered.html).toContain("&lt;b&gt;Rai&lt;/b&gt;");
  });

  it("uses the single alert as the subject, and a count for several", () => {
    const one = renderDigestEmail(null, { alerts: [alert()], omitted: 0 });
    expect(one.subject).toBe(alert().title);

    const many = renderDigestEmail(null, {
      alerts: [alert(), alert({ symbol: "BBCA" })],
      omitted: 0,
    });
    expect(many.subject).toMatch(/2 stocks/);
  });

  it("always produces a plain text alternative", () => {
    const rendered = renderDigestEmail("Rai", { alerts: [alert()], omitted: 0 });
    expect(rendered.text).toContain(alert().title);
    expect(rendered.text).not.toContain("<table");
  });

  it("states how many alerts were left out of the digest", () => {
    const rendered = renderDigestEmail(null, { alerts: [alert()], omitted: 3 });
    expect(rendered.html).toMatch(/3 further alerts were not included/);
    expect(rendered.text).toMatch(/3 further alerts were not included/);
  });

  it("carries the disclaimer in both formats", () => {
    const rendered = renderDigestEmail(null, { alerts: [alert()], omitted: 0 });
    expect(rendered.html).toMatch(/not investment advice/);
    expect(rendered.text).toMatch(/not investment advice/);
  });
});
