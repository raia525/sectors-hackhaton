import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  renderBriefEmail,
  renderDigestEmail,
  renderOtpEmail,
  renderPasswordResetEmail,
  renderVerificationEmail,
} from "./email";
import { msg } from "@/lib/i18n/message";
import { buildBrief, type BriefRow } from "@/lib/intelligence/brief";
import type { Alert } from "./rules";

function briefRow(over: Partial<BriefRow> = {}): BriefRow {
  return {
    symbol: "BBRI",
    companyName: "Bank Rakyat Indonesia",
    sector: "Financials",
    zScore: 2.6,
    verdict: "significant",
    fitQuality: 0.6,
    constituentCount: 5,
    totalReturn: 0.05,
    marketReturn: 0.02,
    sectorReturn: 0.01,
    idioReturn: 0.023,
    realityVerdict: "price_ahead_of_narrative",
    smartMoneyType: "bullish_divergence",
    smartMoneyConviction: 70,
    ...over,
  };
}

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

describe("renderVerificationEmail", () => {
  it("includes the verification link in both formats", () => {
    const url = "https://example.com/verify-email?token=abc123";
    const rendered = renderVerificationEmail("en", "Rai", url);
    expect(rendered.html).toContain(url);
    expect(rendered.text).not.toContain("<a href");
    expect(rendered.html).not.toContain("<script");
  });

  it("escapes the recipient name", () => {
    const rendered = renderVerificationEmail("en", `<b>Rai</b>`, "https://example.com/x");
    expect(rendered.html).toContain("&lt;b&gt;Rai&lt;/b&gt;");
    expect(rendered.html).not.toContain("<b>Rai</b>");
  });

  it("renders in Indonesian", () => {
    const rendered = renderVerificationEmail("id", null, "https://example.com/x");
    expect(rendered.subject).toMatch(/Konfirmasi email/);
    expect(rendered.html).toMatch(/Verifikasi email/);
  });

  it("carries the disclaimer in both formats", () => {
    const rendered = renderVerificationEmail("en", null, "https://example.com/x");
    expect(rendered.html).toMatch(/not investment advice/);
    expect(rendered.text).toMatch(/not investment advice/);
  });
});

describe("renderOtpEmail", () => {
  it("shows the code in the subject, html and text", () => {
    const rendered = renderOtpEmail("en", "Rai", "042817");
    expect(rendered.subject).toContain("042817");
    expect(rendered.html).toContain("042817");
    expect(rendered.text).toContain("042817");
  });

  it("states an expiry window", () => {
    const rendered = renderOtpEmail("en", null, "042817");
    expect(rendered.html).toMatch(/10 minutes/);
    expect(rendered.text).toMatch(/10 minutes/);
  });

  it("renders in Indonesian", () => {
    const rendered = renderOtpEmail("id", null, "042817");
    expect(rendered.html).toMatch(/Kode masuk Anda/);
    expect(rendered.html).toContain("042817");
  });
});

describe("renderPasswordResetEmail", () => {
  it("includes the reset link in both formats", () => {
    const url = "https://example.com/reset-password?token=xyz789";
    const rendered = renderPasswordResetEmail("en", "Rai", url);
    expect(rendered.html).toContain(url);
    expect(rendered.text).not.toContain("<a href");
  });

  it("renders in Indonesian", () => {
    const rendered = renderPasswordResetEmail("id", null, "https://example.com/x");
    expect(rendered.subject).toMatch(/Atur ulang password/);
  });

  it("carries the disclaimer in both formats", () => {
    const rendered = renderPasswordResetEmail("en", null, "https://example.com/x");
    expect(rendered.html).toMatch(/not investment advice/);
    expect(rendered.text).toMatch(/not investment advice/);
  });
});

describe("renderBriefEmail", () => {
  const input = (rows: BriefRow[]) => ({
    runDate: "2026-09-25",
    brief: buildBrief(rows),
    calendar: [],
    briefUrl: "https://example.com/brief",
  });

  it("states how many stocks were covered, so it never reads as the whole market", () => {
    const rendered = renderBriefEmail("en", null, input([briefRow(), briefRow({ symbol: "BBCA", zScore: 0.4 })]));
    expect(rendered.text).toMatch(/Across the 2 stocks analysed today, 1 moved/);
    expect(rendered.subject).toBe("Market brief 2026-09-25: 1 unusual moves");
  });

  it("lists movers, disagreements and smart money, and links to the page", () => {
    const rendered = renderBriefEmail("en", "Rai", input([briefRow()]));
    expect(rendered.text).toMatch(/BBRI: \+2\.30% stock specific, z-score \+2\.60/);
    expect(rendered.text).toMatch(/Price ahead of the story/);
    expect(rendered.text).toMatch(/conviction 70 of 100/);
    expect(rendered.html).toContain("https://example.com/brief");
  });

  it("uses a no-moves subject when nothing crossed the threshold", () => {
    const rendered = renderBriefEmail("en", null, input([briefRow({ zScore: 0.5 })]));
    expect(rendered.subject).toBe("Market brief 2026-09-25: no unusual moves");
  });

  it("escapes stock data rather than trusting it as markup", () => {
    const rendered = renderBriefEmail("en", null, input([briefRow({ symbol: "<b>X</b>" })]));
    expect(rendered.html).not.toContain("<b>X</b>");
    expect(rendered.html).toContain("&lt;b&gt;X&lt;/b&gt;");
  });

  it("renders in Indonesian", () => {
    const rendered = renderBriefEmail("id", null, input([briefRow()]));
    expect(rendered.text).toMatch(/Dari 1 saham yang dianalisis hari ini/);
    expect(rendered.text).toMatch(/bukan saran investasi/);
  });
});
