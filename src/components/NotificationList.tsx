"use client";

import Link from "next/link";
import { Badge, type BadgeTone } from "./ui/primitives";
import { useTranslation } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Alert history.
 *
 * Title and body are rendered exactly as stored at send time, in whichever
 * language the recipient was using then, rather than recomputed against the
 * current UI language: a notification is a record of what was communicated,
 * and re-resolving it later would quietly rewrite history. Only the kind
 * badge, which is chrome rather than content, follows the current language.
 */

interface Notification {
  id: string;
  symbol: string;
  kind: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

const KIND_COPY: Record<string, { key: TranslationKey; tone: BadgeTone }> = {
  DIVERGENCE: { key: "watchlist.kind.divergence", tone: "significant" },
  CORPORATE_ACTION: { key: "watchlist.kind.corporateAction", tone: "accent" },
  SMART_MONEY: { key: "watchlist.kind.smartMoney", tone: "extreme" },
};

export function NotificationList({
  notifications,
}: {
  notifications: Notification[];
}) {
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

        return (
          <li
            key={n.id}
            className={`rounded-[var(--radius-sm)] border p-3 ${
              n.read ? "border-border bg-transparent" : "border-border-strong bg-surface-raised"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/?symbol=${n.symbol}`}
                className="text-sm font-medium leading-snug text-text hover:text-accent"
              >
                {n.title}
              </Link>
              <Badge tone={kind?.tone ?? "neutral"}>
                {kind ? t(kind.key) : n.kind.toLowerCase()}
              </Badge>
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{n.body}</p>

            <time
              dateTime={n.createdAt}
              className="tnum mt-1.5 block text-xs text-text-subtle"
            >
              {n.createdAt.slice(0, 16).replace("T", " ")}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
