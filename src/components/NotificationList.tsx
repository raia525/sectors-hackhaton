"use client";

import Link from "next/link";
import { markAlertsRead } from "@/app/portfolio/actions";
import { ActionForm, SubmitButton } from "./ActionForm";
import { Badge } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";
import type { BadgeTone } from "./ui/primitives";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * The alerts sent to the signed-in user, newest first.
 *
 * Titles and bodies are stored as finished text in the language the alert
 * was sent in: a notification is a record of what was communicated, and
 * re-resolving it later would quietly rewrite history. Only the kind badge
 * is translated live.
 *
 * An alert opens the stock's stored analysis on the watchlist, which costs
 * nothing; the full live analysis is a second, labelled link, since it
 * spends data credits.
 */

interface Notification {
  id: string;
  symbol: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Whether the stock is still on the watchlist, so its row can open. */
  watched: boolean;
}

const KIND_COPY: Record<string, { key: TranslationKey; tone: BadgeTone }> = {
  DIVERGENCE: { key: "watchlist.kind.divergence", tone: "significant" },
  CORPORATE_ACTION: { key: "watchlist.kind.corporateAction", tone: "accent" },
  SMART_MONEY: { key: "watchlist.kind.smartMoney", tone: "extreme" },
  RULE: { key: "watchlist.kind.rule", tone: "moderate" },
};

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const { t } = useTranslation();

  if (notifications.length === 0) {
    return (
      <div>
        <p className="text-sm text-text-muted">{t("watchlist.noAlertsYet")}</p>
        <p className="mt-1.5 text-xs text-text-subtle">{t("watchlist.noAlertsHint")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {notifications.map((n) => {
        const kind = KIND_COPY[n.kind];
        const stored = n.watched ? `/portfolio?open=${n.symbol}#${n.symbol}` : `/stocks?symbol=${n.symbol}`;

        return (
          <li
            key={n.id}
            className={`rounded-[var(--radius-sm)] border p-3 ${
              n.read ? "border-border bg-transparent" : "border-border-strong bg-surface-raised"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {n.read ? null : (
                  <span className="mb-1 inline-block rounded-full bg-accent-bright px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t("alerts.new")}
                  </span>
                )}
                <Link href={stored} className="block text-sm font-medium leading-snug text-text hover:text-accent">
                  {n.title}
                </Link>
              </div>
              <Badge tone={kind?.tone ?? "neutral"}>{kind ? t(kind.key) : n.kind.toLowerCase()}</Badge>
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{n.body}</p>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-subtle">
              <time dateTime={n.createdAt} className="tnum">
                {n.createdAt.slice(0, 16).replace("T", " ")}
              </time>
              {n.watched ? (
                <Link href={stored} className="font-semibold text-accent hover:underline">
                  {t("alerts.openStored")}
                </Link>
              ) : null}
              <Link href={`/stocks?symbol=${n.symbol}`} className="hover:text-text hover:underline">
                {t("alerts.openFull")}
              </Link>
              {n.read ? null : (
                <ActionForm action={markAlertsRead} className="inline">
                  <input type="hidden" name="id" value={n.id} />
                  <SubmitButton className="font-semibold text-text-muted hover:text-text hover:underline">
                    {t("alerts.markOne")}
                  </SubmitButton>
                </ActionForm>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
