import Link from "next/link";
import { Badge, type BadgeTone } from "./ui/primitives";

/**
 * Alert history.
 *
 * Bodies are rendered from what was stored at send time rather than recomputed,
 * so an alert reads the same later as when it fired. Recomputing would quietly
 * rewrite history as the underlying prices move.
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

const KIND_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  DIVERGENCE: { label: "divergence", tone: "significant" },
  CORPORATE_ACTION: { label: "corporate action", tone: "accent" },
  SMART_MONEY: { label: "smart money", tone: "extreme" },
};

export function NotificationList({
  notifications,
}: {
  notifications: Notification[];
}) {
  if (notifications.length === 0) {
    return (
      <div>
        <p className="text-sm text-text-muted">No alerts yet.</p>
        <p className="mt-1.5 text-xs text-text-subtle">
          This is the expected state most of the time. Alerts fire only when a
          stock moves beyond what its peers explain, which is uncommon by
          design.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {notifications.map((n) => {
        const kind = KIND_LABEL[n.kind] ?? { label: "alert", tone: "neutral" as const };

        return (
          <li
            key={n.id}
            className={`rounded-[8px] border p-3 ${
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
              <Badge tone={kind.tone}>{kind.label}</Badge>
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
