import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/lib/env";
import { hasHeaderBreak } from "./headers";

/**
 * SMTP delivery for alert digests.
 *
 * Kept behind a narrow interface so the transport can change without touching
 * the alert logic. The dispatcher only asks "was this sent", never how.
 *
 * Two operational decisions:
 *
 * The transporter is created once and reused. Nodemailer pools connections,
 * and building a fresh transporter per email would open a new TCP and TLS
 * handshake for every recipient in a digest run.
 *
 * Failures return false rather than throwing. By the time email is attempted
 * the in-app notifications are already saved, so a refused SMTP connection
 * should degrade the run rather than fail it and lose the alerts.
 */

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const globalForMailer = globalThis as unknown as {
  shadowMailer?: Transporter | null;
};

/** True when every field needed to send is configured. */
export function isEmailConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.NOTIFICATION_FROM_EMAIL,
  );
}

function getTransporter(): Transporter | null {
  if (globalForMailer.shadowMailer !== undefined) {
    return globalForMailer.shadowMailer;
  }

  if (!isEmailConfigured()) {
    globalForMailer.shadowMailer = null;
    return null;
  }

  const env = getEnv();
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    // Port 465 is implicit TLS. Everything else starts plaintext and upgrades
    // via STARTTLS, which `requireTLS` makes mandatory rather than optional, so
    // credentials are never sent over an unencrypted connection.
    secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER as string, pass: env.SMTP_PASSWORD as string },
    pool: true,
    maxConnections: 3,
    // A digest run should not hang on an unresponsive relay.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  globalForMailer.shadowMailer = transporter;
  return transporter;
}

/**
 * Sends one message. Returns false on any failure.
 *
 * Header-bearing fields are validated before they reach the transport. A
 * newline in a recipient or subject is how header injection works, and while
 * these values are ours rather than user supplied, the check costs nothing and
 * removes the question entirely.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) return false;

  if (hasHeaderBreak(message.to) || hasHeaderBreak(message.subject)) {
    console.warn("Refusing to send a message whose headers contain a line break.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: getEnv().NOTIFICATION_FROM_EMAIL,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return true;
  } catch (error) {
    console.error(
      "SMTP delivery failed, the alert remains available in the app:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/** Verifies the SMTP connection. Used by the setup check, not by sending. */
export async function verifyConnection(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      ok: false,
      reason:
        "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and NOTIFICATION_FROM_EMAIL.",
    };
  }

  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unknown SMTP failure.",
    };
  }
}
