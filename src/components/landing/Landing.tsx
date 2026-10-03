import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { MAX_PEER_CANDIDATES } from "@/lib/analysis/service";
import { LanguageToggle } from "../LanguageToggle";
import { ThemeToggle } from "../ThemeToggle";
import { Logo, LogoMark } from "../ui/Logo";
import { Container, IconBadge, InkPanel } from "../ui/primitives";
import {
  IconArrowUpRight,
  IconBell,
  IconCompare,
  IconLayers,
  IconNews,
  IconShield,
  IconSpark,
  IconTarget,
  IconWallet,
} from "../ui/icons";
import { CountUp } from "./CountUp";
import { HeroArc } from "./HeroArc";
import { ScrollReveal } from "./ScrollReveal";
import { TickerMarquee } from "./TickerMarquee";
import { delay, reveal } from "./reveal";

/**
 * The landing page, for a visitor who is not signed in.
 *
 * It is the product's front door and nothing else: no search box and no
 * analysis, since both need an account (see src/proxy.ts). A signed-in
 * visitor reaching `/` gets the Analyse page instead (src/app/page.tsx).
 *
 * Every figure on it is a real property of the product: the ticker count is
 * read from the directory, the peer count from the analysis code, and the
 * rest are true by construction. Partner logos, ratings and testimonials a
 * template would carry are replaced rather than invented.
 *
 * Sections animate in as they are scrolled to, in both directions (see
 * ScrollReveal and reveal.ts); the hero cards float and the figures count up.
 */
export async function Landing() {
  const { t } = await getTranslator();
  const tickerCount = await countTickers();

  return (
    <div className="overflow-x-clip">
      <ScrollReveal />
      <div aria-hidden className="scroll-progress fixed inset-x-0 top-0 z-[60] h-[3px] bg-accent-bright" />

      {/* Hero: a rounded photo card holding the navigation, the headline and the card arc. */}
      <section className="px-3 pt-3 lg:px-4 lg:pt-4">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0b0b10]">
          <div
            aria-hidden
            className="parallax absolute inset-x-0 -top-10 bottom-0 -z-10"
            style={{ "--parallax": "90px" } as React.CSSProperties}
          >
            <Image
              src="/landing/jakarta-tokopedia.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_70%]"
            />
            {/* A flat wash, not a gradient: it only has to keep white text
                legible over the bright horizon. */}
            <div className="absolute inset-0 bg-[#0b0b10]/45" />
          </div>

          <nav
            aria-label="Main"
            className="flex items-center justify-between gap-4 px-5 py-4 text-white lg:px-8"
          >
            <Link href="/" aria-label="SHADOW IDX" className="ink shrink-0 rounded-full bg-transparent">
              {/* The wordmark does not fit beside the toggles and the button on a phone. */}
              <span className="sm:hidden"><LogoMark size={36} /></span>
              <span className="hidden sm:block"><Logo /></span>
            </Link>
            <ul className="hidden items-center gap-9 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/80 md:flex">
              <li><a href="#how" className="transition-colors hover:text-white">{t("landing.howTitle")}</a></li>
              <li><a href="#features" className="transition-colors hover:text-white">{t("landing.nav.features")}</a></li>
              <li><a href="#principles" className="transition-colors hover:text-white">{t("landing.nav.principles")}</a></li>
            </ul>
            <div className="ink flex items-center gap-1.5 rounded-full bg-transparent">
              <LanguageToggle floating />
              <ThemeToggle compact />
              <Link
                href="/signup"
                className="ml-1 whitespace-nowrap rounded-full bg-accent-bright px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover sm:px-5"
              >
                {t("landing.getStarted")}
              </Link>
            </div>
          </nav>

          <div className="px-5 pb-10 pt-12 text-center lg:pt-16" data-reveal="up" data-state="in">
            <h1 className="rise mx-auto max-w-4xl text-[40px] font-extrabold leading-[1.04] tracking-tight text-balance text-white sm:text-[56px] lg:text-[72px]" style={delay(60)}>
              <span className="block">{t("landing.titleLead")}</span>
              <span className="block text-[#ffb27a]">{t("landing.titleAccent")}</span>
            </h1>
            <p className="rise mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/80" style={delay(160)}>
              {t("home.description")}
            </p>
            <div className="rise mt-8 flex flex-wrap items-center justify-center gap-3" style={delay(260)}>
              <Link
                href="/signin"
                className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-[13px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                {t("nav.signIn")}
              </Link>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 rounded-full bg-accent-bright py-1.5 pl-6 pr-1.5 text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover"
              >
                {t("landing.getStarted")}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b0b10] transition-transform group-hover:rotate-45">
                  <IconArrowUpRight size={16} />
                </span>
              </Link>
            </div>
          </div>

          <div className="px-4 pb-6 pt-6 lg:pb-8">
            {/* Scaled down on a phone so the three middle cards fit the width,
                with the scaled-away height taken back below it. */}
            <div className="origin-top max-sm:-mb-14 max-sm:scale-[0.68]">
            <HeroArc
              labels={{
                twin: t("chart.syntheticTwin"),
                chart: t("landing.card.chart"),
                stock: t("landing.illustrationStock"),
                twinLine: t("chart.syntheticTwin"),
                specific: t("attribution.specific"),
                significant: t("verdict.divergence.significant"),
                question: t("landing.card.question"),
                track: t("landing.card.track"),
                trackBody: t("landing.card.trackBody"),
                news: t("brief.tableNews"),
                priceAhead: t("verdict.reality.priceAhead"),
                smart: t("brief.smartMoneyTitle"),
                bullish: t("smartmoney.type.bullish"),
              }}
            />
            </div>
            <p className="mt-8 text-center text-[12px] font-semibold text-white/70">
              {t("landing.sampleCards")}
              {tickerCount !== null ? (
                <>
                  <span className="mx-2 text-white/40">·</span>
                  {t("landing.tickerCount", { count: tickerCount })}
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <TickerMarquee label={t("landing.marqueeLabel")} />

      {/* Statement */}
      <Container className="py-16 text-center lg:py-20">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-text-muted" {...reveal("up")}>
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent-bright align-middle" />
          {t("landing.about.eyebrow")}
        </p>
        <h2 className="mx-auto mt-6 max-w-4xl text-[30px] font-semibold leading-[1.18] tracking-tight text-text sm:text-[40px] lg:text-[48px]">
          <span className="block" {...reveal("up", 80)}>{t("landing.about.line1")}</span>
          <span className="block" {...reveal("up", 180)}>
            {t("landing.about.line2a")}{" "}
            <InlineChip tone="ink"><IconLayers size={20} /></InlineChip>{" "}
            {t("landing.about.line2b")}
          </span>
          <span className="block text-text-subtle" {...reveal("up", 280)}>
            {t("landing.about.line3a")}{" "}
            <InlineChip tone="accent"><IconTarget size={20} /></InlineChip>{" "}
            {t("landing.about.line3b")}
          </span>
        </h2>
      </Container>

      {/* Figures, as a bento grid */}
      <Container className="pb-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <div className="lift relative min-h-[380px] overflow-hidden rounded-[var(--radius)] lg:row-span-2" {...reveal("left")}>
            <Image src="/landing/laptop-chart.jpg" alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
            <span className="absolute left-5 top-5 rounded-full bg-[#0b0b10]/70 px-3 py-1.5 text-[12px] font-extrabold tracking-tight text-white backdrop-blur-sm">
              SHADOW <span className="font-medium text-white/70">IDX</span>
            </span>
            <div className="absolute inset-x-4 bottom-4 rounded-[var(--radius-sm)] bg-surface p-5">
              <div className="text-[44px] font-extrabold leading-none tracking-tight text-text">
                {tickerCount !== null ? <CountUp value={tickerCount} /> : "IDX"}
              </div>
              <p className="mt-2 text-[13px] leading-snug text-text-muted">
                {tickerCount !== null ? t("landing.stat.tickers") : t("landing.stat.tickersFallback")}
              </p>
            </div>
          </div>

          <div className="lift flex flex-col justify-between rounded-[var(--radius)] bg-surface-raised p-6 lg:row-span-2" {...reveal("up", 120)}>
            <div>
              <p className="text-[13px] font-semibold text-text-muted">{t("landing.stat.splitLabel")}</p>
              <p className="mt-3 text-[44px] font-extrabold leading-none tracking-tight text-text">
                <CountUp value={3} durationMs={900} /> <span className="text-[24px]">{t("landing.stat.splitUnit")}</span>
              </p>
            </div>
            <div className="mt-10">
              <div className="flex flex-wrap gap-2">
                {[t("attribution.market"), t("attribution.sector"), t("attribution.specific")].map((part, i) => (
                  <span
                    key={part}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
                      i === 2 ? "bg-accent-bright text-white" : "bg-surface text-text-muted"
                    }`}
                  >
                    {part}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-[15px] font-medium leading-relaxed text-text">
                &ldquo;{t("landing.stat.splitQuote")}&rdquo;
              </p>
            </div>
          </div>

          <div className="lift accent-panel rounded-[var(--radius)] p-6" {...reveal("right", 80)}>
            <p className="text-[13px] font-semibold text-text-muted">{t("landing.stat.peersLabel")}</p>
            <p className="mt-3 text-[44px] font-extrabold leading-none tracking-tight">
              <CountUp value={MAX_PEER_CANDIDATES} durationMs={1000} />
            </p>
            <p className="mt-6 text-[13px] leading-snug text-text-muted">{t("landing.stat.peersCaption")}</p>
          </div>

          <div className="lift ink flex items-center justify-between gap-4 rounded-[var(--radius)] p-6" {...reveal("right", 200)}>
            <div>
              <p className="text-[13px] font-semibold text-text">{t("landing.stat.forecastsLabel")}</p>
              <p className="mt-1 text-[12px] text-text-muted">{t("landing.stat.forecastsCaption")}</p>
            </div>
            <p className="text-[44px] font-extrabold leading-none tracking-tight text-text">0</p>
          </div>
        </div>
      </Container>

      {/* How it works */}
      <section id="how" className="scroll-mt-6">
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
              className="lift rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
              {...reveal("up", i * 120)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  {t("landing.stepLabel", { n: i + 1 })}
                </span>
                <IconBadge>{step.icon}</IconBadge>
              </div>
              <h3 className="mt-5 text-[19px] font-extrabold tracking-tight text-text">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </Container>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-6">
        <Container className="py-12">
        <SectionHeading title={t("landing.featuresTitle")} subtitle={t("landing.featuresSubtitle")} />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InkPanel className="flex flex-col justify-between md:col-span-2 lg:row-span-2" {...reveal("left")}>
            <div>
              <IconBadge><IconLayers /></IconBadge>
              <h3 className="mt-5 text-[24px] font-extrabold tracking-tight text-text">{t("landing.feature.twinTitle")}</h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-text-muted">{t("landing.feature.twinBody")}</p>
            </div>
            <ul aria-hidden className="mt-8 space-y-2">
              {[100, 78, 61].map((w, i) => (
                <li
                  key={w}
                  className={`flex items-center gap-3 rounded-[var(--radius-sm)] px-4 py-3 ${i === 0 ? "accent-panel" : "bg-surface-raised"}`}
                >
                  <span className="h-8 w-8 shrink-0 rounded-full bg-surface" />
                  <span className="h-2 flex-1 rounded-full bg-surface">
                    <span className="reveal-grow block h-full rounded-full bg-accent" style={{ width: `${w}%`, ...delay(400 + i * 160) }} />
                  </span>
                </li>
              ))}
            </ul>
          </InkPanel>

          <div className="lift accent-panel rounded-[var(--radius)] p-6 md:col-span-2" {...reveal("right", 100)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"><IconNews /></span>
            <h3 className="mt-4 text-[19px] font-extrabold tracking-tight">{t("landing.feature.realityTitle")}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted">{t("landing.feature.realityBody")}</p>
          </div>

          <FeatureCard icon={<IconWallet />} title={t("landing.feature.smartTitle")} body={t("landing.feature.smartBody")} delayMs={180} />
          <FeatureCard icon={<IconSpark />} title={t("landing.feature.actionsTitle")} body={t("landing.feature.actionsBody")} delayMs={280} />
          <FeatureCard icon={<IconBell />} title={t("landing.feature.alertsTitle")} body={t("landing.feature.alertsBody")} delayMs={120} className="md:col-span-1 lg:col-span-2" />
          <FeatureCard icon={<IconCompare />} title={t("landing.feature.compareTitle")} body={t("landing.feature.compareBody")} delayMs={240} className="md:col-span-1 lg:col-span-2" />
        </div>
      </Container>
      </section>

      {/* Principles */}
      <section id="principles" className="scroll-mt-6">
        <Container className="py-12">
        <InkPanel className="grid gap-10 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-12" {...reveal("zoom")}>
          <div>
            <IconBadge><IconShield /></IconBadge>
            <h2 className="mt-5 text-[30px] font-extrabold leading-tight tracking-tight text-text">{t("landing.honestyTitle")}</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-text-muted">{t("landing.honestyBody")}</p>
          </div>
          <ul className="space-y-3 self-center">
            {[t("landing.honestyPoint1"), t("landing.honestyPoint2"), t("landing.honestyPoint3")].map((point, i) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-surface-raised p-4 text-[15px] leading-relaxed text-text"
                {...reveal("right", 250 + i * 140)}
              >
                <span aria-hidden className="reveal-pop mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-bright text-white" style={delay(550 + i * 140)}>
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
      </section>

      {/* Call to action, on a second photo */}
      <section className="px-3 pb-3 pt-12 lg:px-4 lg:pb-4">
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0b0b10] px-6 py-16 text-center lg:py-24" {...reveal("zoom")}>
          <Image src="/landing/jakarta-golden.jpg" alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_30%]" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[#0b0b10]/55" />
          <h2 className="mx-auto max-w-2xl text-[32px] font-extrabold leading-tight tracking-tight text-balance text-white lg:text-[44px]">
            {t("landing.ctaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-white/80">{t("landing.ctaBody")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signin"
              className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-[13px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/signup"
              className="group inline-flex items-center gap-3 rounded-full bg-accent-bright py-1.5 pl-6 pr-1.5 text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover"
            >
              {t("landing.getStarted")}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b0b10] transition-transform group-hover:rotate-45">
                <IconArrowUpRight size={16} />
              </span>
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-text-subtle">
          {t("landing.photoCredit")}{" "}
          <a className="underline-offset-2 hover:underline" href="https://unsplash.com/photos/a-city-skyline-at-night-UaHqk4Z53sQ">Fahrul Razi</a>,{" "}
          <a className="underline-offset-2 hover:underline" href="https://unsplash.com/photos/a-person-pointing-at-a-chart-on-a-laptop-dLZbAuSA_EI">Jakub Żerdzicki</a>,{" "}
          <a className="underline-offset-2 hover:underline" href="https://unsplash.com/photos/golden-sunset-over-the-city-skyline-iPbyozQ8a34">David Kristianto</a>{" "}
          / Unsplash
        </p>
      </section>
    </div>
  );
}

function InlineChip({ tone, children }: { tone: "ink" | "accent"; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={`reveal-pop inline-flex h-11 w-11 items-center justify-center rounded-full align-middle sm:h-12 sm:w-12 ${
        tone === "ink" ? "ink" : "bg-accent-bright text-white"
      }`}
      style={delay(450)}
    >
      {children}
    </span>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl" {...reveal("up")}>
      <h2 className="text-[30px] font-extrabold leading-tight tracking-tight text-text lg:text-[34px]">{title}</h2>
      <p className="mt-2 text-[16px] leading-relaxed text-text-muted">{subtitle}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  delayMs,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  delayMs: number;
  className?: string;
}) {
  return (
    <div
      className={`lift rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] ${className}`}
      {...reveal("up", delayMs)}
    >
      <IconBadge>{icon}</IconBadge>
      <h3 className="mt-4 text-[17px] font-extrabold tracking-tight text-text">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-text-muted">{body}</p>
    </div>
  );
}

/**
 * The number of searchable tickers, read from the synced directory. Shown
 * only when it is real: with no database, or before the first sync, it is
 * left out rather than displayed as a zero or a made-up figure.
 */
async function countTickers(): Promise<number | null> {
  try {
    const count = await prisma.companyDirectoryEntry.count();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}
