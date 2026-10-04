import { getTranslator } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/primitives";

/** The shared title row of the Market tabs, with the run date when there is one. */
export async function MarketHeader({
  title,
  description,
  runDate,
}: {
  title: string;
  description: string;
  runDate?: string;
}) {
  const { t } = await getTranslator();
  return (
    <PageHeader
      title={title}
      description={description}
      actions={
        runDate ? (
          <span className="tnum rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-muted">
            {t("brief.asOf", { date: runDate })}
          </span>
        ) : null
      }
    />
  );
}
