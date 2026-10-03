import type { AdminAuditLog } from "@prisma/client";

/** A list of admin changes, newest first. Shared by the overview and the audit page. */
export function AuditList({ entries, emptyLabel }: { entries: AdminAuditLog[]; emptyLabel: string }) {
  if (entries.length === 0) return <p className="text-sm text-text-muted">{emptyLabel}</p>;

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">
              <code className="rounded bg-surface-raised px-1.5 py-0.5 text-[12px]">{entry.action}</code>{" "}
              <span className="break-all text-text-muted">{entry.target}</span>
            </p>
            <p className="mt-0.5 text-xs text-text-subtle">{entry.actorEmail}</p>
          </div>
          <time dateTime={entry.createdAt.toISOString()} className="tnum text-xs text-text-subtle">
            {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
          </time>
        </li>
      ))}
    </ul>
  );
}
