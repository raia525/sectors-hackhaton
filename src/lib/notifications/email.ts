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
