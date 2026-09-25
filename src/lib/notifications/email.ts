import type { Alert } from "./rules";
import { translate } from "@/lib/i18n/translate";
import { renderMessage } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Digest email rendering.
 *
 * Written as inline-styled tables rather than modern CSS because email clients
 * still do not reliably support flexbox, grid, or external stylesheets. A plain
 * text alternative is always produced alongside the HTML, since some clients
 * and most screen readers prefer it.
 *
 * Every interpolated value is escaped. Alert bodies contain company names and
 * API-sourced text, and treating that as trusted markup in an email would be an
 * injection vector.
 *
 * Rendered in the recipient's stored locale (see dispatch.ts): this runs
 * inside a scheduled job with no active browser session, so there is no
 * cookie to read the viewer's language preference from.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Escapes text for safe interpolation into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderDigestEmail(
  locale: Locale,
  name: string | null,
  digest: { alerts: Alert[]; omitted: number },
): RenderedEmail {
  const { alerts, omitted } = digest;
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);
  const tm = (message: Alert["title"]) => renderMessage(message, t);

  const greeting = name ? t("email.greeting.named", { name }) : t("email.greeting.anonymous");
  const omittedLabel = omitted === 1 ? t("email.omitted.singular") : t("email.omitted.plural");

  const subject =
    alerts.length === 1
      ? tm(alerts[0].title)
      : t("email.subjectMultiple", { count: alerts.length });

  const alertText = (alert: Alert) =>
    `${tm(alert.title)}\n${alert.body.map((b) => tm(b)).join(" ")}`;

  const rows = alerts
    .map(
      (alert) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #26262a;">
          <div style="font-size:15px;font-weight:600;color:#ededec;margin-bottom:6px;">
            ${escapeHtml(tm(alert.title))}
          </div>
          <div style="font-size:14px;line-height:1.55;color:#a1a1a0;">
            ${escapeHtml(alert.body.map((b) => tm(b)).join(" "))}
          </div>
        </td>
      </tr>`,
    )
    .join("");

  const omittedNote =
    omitted > 0
      ? `<p style="font-size:13px;color:#6e6e6d;margin:16px 0 0;">
           ${escapeHtml(t("email.omittedNote", { count: omitted, label: omittedLabel }))}
         </p>`
      : "";

  const preheader = alertText(alerts[0]).slice(0, 120);

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0d;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0d;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141416;border:1px solid #26262a;border-radius:10px;padding:28px;">
          <tr>
            <td>
              <div style="font-size:14px;font-weight:600;letter-spacing:0.02em;color:#ededec;margin-bottom:22px;">
                SHADOW <span style="font-weight:300;color:#a1a1a0;">IDX</span>
              </div>
              <p style="font-size:14px;color:#a1a1a0;margin:0 0 4px;">${escapeHtml(greeting)}</p>
              <p style="font-size:14px;line-height:1.55;color:#a1a1a0;margin:0 0 8px;">
                ${escapeHtml(t("email.intro"))}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows}
              </table>
              ${omittedNote}
              <p style="font-size:12px;line-height:1.6;color:#6e6e6d;margin:24px 0 0;">
                ${escapeHtml(t("email.footer.disclaimer"))}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    t("email.intro"),
    "",
    ...alerts.map((a) => `${alertText(a)}\n`),
    omitted > 0 ? `${t("email.omittedNote", { count: omitted, label: omittedLabel })}\n` : "",
    t("email.footer.disclaimer"),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

/**
 * The shared shell for a transactional email: brand mark, greeting, a body
 * block supplied by the caller, and an optional button. Kept separate from
 * renderDigestEmail's own markup because a digest has a list of alerts to
 * lay out while these are all a single message plus one action, but both
 * read from the same dark, orange-accented palette as the rest of the app.
 */
function renderTransactionalEmail(params: {
  locale: Locale;
  subject: string;
  greeting: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footnoteHtml: string;
  footnoteText: string;
}): RenderedEmail {
  const { locale, subject, greeting, bodyHtml, bodyText, ctaLabel, ctaUrl, footnoteHtml, footnoteText } =
    params;

  const button =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr>
            <td style="border-radius:999px;background:#ea580c;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0c0c0d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0c0d;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#141416;border:1px solid #26262a;border-radius:10px;padding:28px;">
          <tr>
            <td>
              <div style="font-size:14px;font-weight:600;letter-spacing:0.02em;color:#ededec;margin-bottom:22px;">
                SHADOW <span style="font-weight:300;color:#a1a1a0;">IDX</span>
              </div>
              <p style="font-size:14px;color:#a1a1a0;margin:0 0 4px;">${escapeHtml(greeting)}</p>
              <div style="font-size:14px;line-height:1.6;color:#a1a1a0;margin:8px 0;">
                ${bodyHtml}
              </div>
              ${button}
              <p style="font-size:12px;line-height:1.6;color:#6e6e6d;margin:20px 0 0;">
                ${footnoteHtml}
              </p>
              <p style="font-size:12px;line-height:1.6;color:#6e6e6d;margin:16px 0 0;border-top:1px solid #26262a;padding-top:16px;">
                ${escapeHtml(translate(locale, "email.footer.disclaimer"))}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    bodyText,
    "",
    footnoteText,
    "",
    translate(locale, "email.footer.disclaimer"),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

/**
 * Sign up verification email. The link carries a raw, single use token; only
 * its hash is ever stored, so this email is the only place the working link
 * exists (see hashToken in src/lib/auth.ts).
 */
export function renderVerificationEmail(
  locale: Locale,
  name: string | null,
  verifyUrl: string,
): RenderedEmail {
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);
  const greeting = name ? t("email.greeting.named", { name }) : t("email.greeting.anonymous");

  return renderTransactionalEmail({
    locale,
    subject: t("email.verify.subject"),
    greeting,
    bodyHtml: `<p style="margin:0;">${escapeHtml(t("email.verify.body"))}</p>`,
    bodyText: t("email.verify.body"),
    ctaLabel: t("email.verify.cta"),
    ctaUrl: verifyUrl,
    footnoteHtml: escapeHtml(t("email.verify.expiry")),
    footnoteText: t("email.verify.expiry"),
  });
}

/**
 * The one time code for the second step of sign in. The code is shown large
 * and in tabular figures, since email clients ignore the app's own .tnum
 * utility class and need the style written inline.
 */
export function renderOtpEmail(
  locale: Locale,
  name: string | null,
  code: string,
): RenderedEmail {
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);
  const greeting = name ? t("email.greeting.named", { name }) : t("email.greeting.anonymous");

  const codeBlock = `<p style="margin:0;">${escapeHtml(t("email.otp.body"))}</p>
    <div style="margin:20px 0;padding:16px 20px;background:rgba(234,88,12,0.14);border:1px solid rgba(234,88,12,0.35);border-radius:10px;text-align:center;">
      <span style="font-size:32px;font-weight:800;letter-spacing:0.35em;color:#fb923c;font-variant-numeric:tabular-nums;">
        ${escapeHtml(code)}
      </span>
    </div>`;

  return renderTransactionalEmail({
    locale,
    subject: t("email.otp.subject", { code }),
    greeting,
    bodyHtml: codeBlock,
    bodyText: `${t("email.otp.body")}\n\n${code}`,
    footnoteHtml: escapeHtml(t("email.otp.expiry")),
    footnoteText: t("email.otp.expiry"),
  });
}

/** Password reset link. Same single use, hash-stored token as verification. */
export function renderPasswordResetEmail(
  locale: Locale,
  name: string | null,
  resetUrl: string,
): RenderedEmail {
  const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
    translate(locale, key, params);
  const greeting = name ? t("email.greeting.named", { name }) : t("email.greeting.anonymous");

  return renderTransactionalEmail({
    locale,
    subject: t("email.resetPassword.subject"),
    greeting,
    bodyHtml: `<p style="margin:0;">${escapeHtml(t("email.resetPassword.body"))}</p>`,
    bodyText: t("email.resetPassword.body"),
    ctaLabel: t("email.resetPassword.cta"),
    ctaUrl: resetUrl,
    footnoteHtml: escapeHtml(t("email.resetPassword.expiry")),
    footnoteText: t("email.resetPassword.expiry"),
  });
}
