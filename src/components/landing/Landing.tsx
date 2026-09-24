import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { SymbolSearch } from "../SymbolSearch";
import { HeroIllustration } from "./HeroIllustration";
import { Container, IconBadge, InkPanel } from "../ui/primitives";
import {
  IconArrowRight,
  IconBell,
  IconCompare,
  IconLayers,
  IconNews,
  IconSearch,
  IconShield,
  IconSpark,
  IconTarget,
  IconWallet,
} from "../ui/icons";

/**
 * The landing page, shown when no ticker has been searched yet.
 *
 * It explains the product in the order a first-time visitor needs it: the
 * promise and a search box to act on it immediately, how it works, what each
 * analysis shows, why it is built to be cautious, and a final nudge with
 * example links for someone who does not yet have a ticker in mind.
 */
export async function Landing() {
  const { t } = await getTranslator();
  const tickerCount = await countTickers();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-accent/10 blur-3xl"
        />
        <Container className="relative grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-bold text-text-muted shadow-[var(--shadow-card)]">
              <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
              {t("brand.tagline")}
            </span>
            <h1 className="mt-5 text-[44px] font-extrabold leading-[1.05] tracking-tight text-text lg:text-[60px]">
              {t("landing.titleLead")}{" "}
              <span className="text-accent">{t("landing.titleAccent")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-text-muted">
              {t("home.description")}
            </p>

            <div className="mt-8 max-w-xl">
              <SymbolSearch />
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-semibold text-text-muted">
              {tickerCount !== null ? (
                <li className="flex items-center gap-2">
                  <IconSearch size={16} />
                  {t("landing.tickerCount", { count: tickerCount })}
                </li>
              ) : null}
              <li className="flex items-center gap-2">
                <IconLayers size={16} />
                {t("landing.dataSource")}
              </li>
              <li className="flex items-center gap-2">
                <IconShield size={16} />
                {t("landing.noForecast")}
              </li>
            </ul>
          </div>

          <HeroIllustration
            labels={{
              illustration: t("landing.illustration"),
              stock: t("landing.illustrationStock"),
              twin: t("chart.syntheticTwin"),
              market: t("attribution.market"),
              peers: t("attribution.sector"),
              specific: t("attribution.specific"),
            }}
          />
        </Container>
      </section>

      {/* How it works */}
      <Container className="py-12">
        <SectionHeading title={t("landing.howTitle")} subtitle={t("landing.howSubtitle")} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: <IconLayers />, title: t("landing.step1Title"), body: t("landing.step1Body") },
            { icon: <IconTarget />, title: t("landing.step2Title"), body: t("landing.step2Body") },
            { icon: <IconNews />, title: t("landing.step3Title"), body: t("landing.step3Body") },
          ].map((step, i) => (
            <div
              key={step.title}
              className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  {t("landing.stepLabel", { n: i + 1 })}
                </span>
                <IconBadge>{step.icon}</IconBadge>
              </div>
              <h3 className="mt-5 text-[19px] font-extrabold tracking-tight text-text">
                {step.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* Features, as a bento grid */}
      <Container className="py-12">
        <SectionHeading
          title={t("landing.featuresTitle")}
          subtitle={t("landing.featuresSubtitle")}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InkPanel className="flex flex-col justify-between md:col-span-2 lg:row-span-2">
            <div>
              <IconBadge>
                <IconLayers />
              </IconBadge>
              <h3 className="mt-5 text-[24px] font-extrabold tracking-tight text-text">
                {t("landing.feature.twinTitle")}
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-text-muted">
                {t("landing.feature.twinBody")}
              </p>
            </div>
            {/* A peer list in miniature, echoing the analysis page. */}
            <ul aria-hidden className="mt-8 space-y-2">
              {[100, 78, 61].map((w, i) => (
                <li
                  key={w}
                  className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 ${
                    i === 0 ? "accent-panel" : "bg-surface-raised"
                  }`}
                >
                  <span className="h-8 w-8 shrink-0 rounded-full bg-surface" />
                  <span className="h-2 flex-1 rounded-full bg-surface">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${w}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </InkPanel>

          <div className="accent-panel rounded-[var(--radius)] p-6 shadow-[var(--shadow-card)] md:col-span-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <IconNews />
            </span>
            <h3 className="mt-4 text-[19px] font-extrabold tracking-tight">
              {t("landing.feature.realityTitle")}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">
              {t("landing.feature.realityBody")}
            </p>
          </div>

          <FeatureCard
            icon={<IconWallet />}
            title={t("landing.feature.smartTitle")}
            body={t("landing.feature.smartBody")}
          />
          <FeatureCard
            icon={<IconSpark />}
            title={t("landing.feature.actionsTitle")}
            body={t("landing.feature.actionsBody")}
          />
          <FeatureCard
            icon={<IconBell />}
            title={t("landing.feature.alertsTitle")}
            body={t("landing.feature.alertsBody")}
            className="md:col-span-1 lg:col-span-2"
          />
          <FeatureCard
            icon={<IconCompare />}
            title={t("landing.feature.compareTitle")}
            body={t("landing.feature.compareBody")}
            className="md:col-span-1 lg:col-span-2"
          />
        </div>
      </Container>

      {/* Honesty */}
      <Container className="py-12">
        <InkPanel className="grid gap-10 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
          <div>
            <IconBadge>
              <IconShield />
            </IconBadge>
            <h2 className="mt-5 text-[30px] font-extrabold leading-tight tracking-tight text-text">
              {t("landing.honestyTitle")}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-muted">
              {t("landing.honestyBody")}
            </p>
          </div>
          <ul className="space-y-3 self-center">
            {[
              t("landing.honestyPoint1"),
              t("landing.honestyPoint2"),
              t("landing.honestyPoint3"),
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-surface-raised p-4 text-[15px] leading-relaxed text-text"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        </InkPanel>
      </Container>

      {/* Call to action */}
      <Container className="py-12">
        <div className="accent-panel flex flex-col items-start justify-between gap-6 rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-card)] lg:flex-row lg:items-center lg:p-10">
          <div>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-tight">
              {t("landing.ctaTitle")}
            </h2>
            <p className="mt-2 text-[16px] text-text-muted">{t("landing.ctaBody")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/?symbol=BBRI"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#c2410c] shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {t("landing.ctaAnalyse", { symbol: "BBRI" })}
              <IconArrowRight size={16} />
            </Link>
            <Link
              href="/compare?symbols=BBRI,BBCA,BMRI,BBNI"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <IconCompare size={16} />
              {t("landing.ctaCompare")}
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-[30px] font-extrabold leading-tight tracking-tight text-text lg:text-[34px]">
        {title}
      </h2>
      <p className="mt-2 text-[16px] leading-relaxed text-text-muted">{subtitle}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      <IconBadge>{icon}</IconBadge>
      <h3 className="mt-4 text-[17px] font-extrabold tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}

/**
 * The number of searchable tickers, read from the synced directory.
 *
 * Shown only when it is real: with no database, or before the first sync, the
 * line is omitted rather than displaying a zero or a made-up figure.
 */
async function countTickers(): Promise<number | null> {
  try {
    const count = await prisma.companyDirectoryEntry.count();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}
