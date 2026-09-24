import type { NewsItem } from "@/lib/sectors/schemas";
import type { ShadowAnalysis } from "@/lib/shadow/types";
import { msg, type Message } from "@/lib/i18n/message";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * Reality check: does the story match the tape?
 *
 * The failure mode this guards against is narrative-led investing. A stock
 * surrounded by upbeat coverage feels like a buy even when its own price is
 * doing nothing its peers are not already doing, and a quiet stock making a
 * genuine idiosyncratic move gets ignored.
 *
 * So rather than scoring sentiment and presenting it as insight, we compare
 * two independent signals and report where they disagree. Disagreement is the
 * output: it is the point at which a user should slow down and look closer.
 *
 * Nothing here predicts prices. Every claim is a statement about observed data,
 * which is what keeps the feature honest.
 */

export type NarrativeTone = "positive" | "negative" | "mixed" | "quiet";
export type AlignmentVerdict =
  | "confirmed"
  | "narrative_ahead_of_price"
  | "price_ahead_of_narrative"
  | "contradiction"
  | "insufficient_evidence";

export interface RealityCheck {
  verdict: AlignmentVerdict;
  /** Confidence in the verdict itself, not in any price prediction. */
  confidence: "high" | "moderate" | "low";
  narrative: {
    tone: NarrativeTone;
    articleCount: number;
    /** Share of coverage leaning positive, in [0,1]. */
    positiveShare: number;
    dominantDimensions: string[];
  };
  price: {
    idiosyncratic: number;
    zScore: number;
    fitQuality: number;
  };
  /** Plain-language statements, each traceable to a number above. */
  findings: Message[];
  /** Explicit limits of this analysis, always shown alongside the verdict. */
  caveats: Message[];
}

/**
 * Indonesian and English cue words for headline tone.
 *
 * This is a transparent lexicon rather than a black-box model on purpose: a
 * user can see exactly why a headline was counted, and a wrong call is
 * auditable. It is a coarse instrument, and `caveats` says so.
 */
const POSITIVE_CUES = [
  "naik", "melonjak", "untung", "laba", "tumbuh", "ekspansi", "rekor", "dividen",
  "akuisisi", "kontrak", "surplus", "positif", "menguat", "optimis", "kenaikan",
  "surge", "profit", "growth", "record", "beat", "upgrade", "expansion", "gain",
];

const NEGATIVE_CUES = [
  "turun", "anjlok", "rugi", "defisit", "gagal", "tersangka", "denda", "suspensi",
  "penurunan", "melemah", "negatif", "utang", "restrukturisasi", "pailit", "korupsi",
  "drop", "loss", "decline", "probe", "downgrade", "fraud", "default", "suspend",
];

/** Counts cue hits in a headline, weighting the title over the body. */
function scoreHeadline(item: NewsItem): number {
  const title = item.title.toLowerCase();
  const body = (item.body ?? "").toLowerCase().slice(0, 500);

  let score = 0;
  for (const cue of POSITIVE_CUES) {
    if (title.includes(cue)) score += 2;
    else if (body.includes(cue)) score += 1;
  }
  for (const cue of NEGATIVE_CUES) {
    if (title.includes(cue)) score -= 2;
    else if (body.includes(cue)) score -= 1;
  }
  return score;
}

/** The report dimensions most represented across a set of articles. */
function dominantDimensions(items: NewsItem[], limit = 3): string[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    for (const [key, value] of Object.entries(item.dimension ?? {})) {
      if (typeof value === "number" && value > 0) {
        totals.set(key, (totals.get(key) ?? 0) + value);
      }
    }
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

/** Minimum articles before tone is treated as a real signal rather than noise. */
const MIN_ARTICLES = 3;
/** Idiosyncratic z-score beyond which price is considered to be "saying something". */
const PRICE_SIGNAL_Z = 1.5;

const TONE_KEY: Record<NarrativeTone, TranslationKey> = {
  positive: "reality.tone.positive",
  negative: "reality.tone.negative",
  mixed: "reality.tone.mixed",
  quiet: "reality.tone.quiet",
};

export function runRealityCheck(
  shadow: ShadowAnalysis,
  news: NewsItem[],
): RealityCheck {
  const scores = news.map(scoreHeadline);
  const positives = scores.filter((s) => s > 0).length;
  const negatives = scores.filter((s) => s < 0).length;
  const rated = positives + negatives;
  const positiveShare = rated === 0 ? 0.5 : positives / rated;

  let tone: NarrativeTone;
  if (news.length < MIN_ARTICLES) tone = "quiet";
  else if (positiveShare >= 0.65) tone = "positive";
  else if (positiveShare <= 0.35) tone = "negative";
  else tone = "mixed";

  const z = shadow.zScore;
  const priceSignal = Math.abs(z) >= PRICE_SIGNAL_Z;
  const priceDirection = shadow.attribution.idiosyncratic >= 0 ? 1 : -1;
  const toneDirection = tone === "positive" ? 1 : tone === "negative" ? -1 : 0;

  const findings: Message[] = [];
  const caveats: Message[] = [];

  let verdict: AlignmentVerdict;
  if (news.length < MIN_ARTICLES && !priceSignal) {
    verdict = "insufficient_evidence";
  } else if (toneDirection !== 0 && priceSignal && toneDirection === priceDirection) {
    verdict = "confirmed";
  } else if (toneDirection !== 0 && priceSignal && toneDirection !== priceDirection) {
    verdict = "contradiction";
  } else if (toneDirection !== 0 && !priceSignal) {
    verdict = "narrative_ahead_of_price";
  } else if (toneDirection === 0 && priceSignal) {
    verdict = "price_ahead_of_narrative";
  } else {
    verdict = "insufficient_evidence";
  }

  const idioPct = (shadow.attribution.idiosyncratic * 100).toFixed(2);
  const marketPct = (shadow.attribution.market * 100).toFixed(2);
  const sectorPct = (shadow.attribution.sector * 100).toFixed(2);

  findings.push(
    msg("reality.attribution", {
      marketPct,
      sectorPct,
      idioPct,
      symbol: shadow.symbol,
    }),
  );

  // The tone word is itself translated (positive/negative/...), so it travels
  // as a nested Message rather than a raw string; renderMessage resolves it
  // in the viewer's locale before the outer sentence is assembled.
  const toneMessage = msg(TONE_KEY[tone]);
  const zFormatted = z.toFixed(2);

  switch (verdict) {
    case "confirmed":
      findings.push(msg("reality.confirmed", { tone: toneMessage, z: zFormatted }));
      break;
    case "contradiction":
      findings.push(msg("reality.contradiction", { tone: toneMessage, z: zFormatted }));
      break;
    case "narrative_ahead_of_price":
      findings.push(
        msg("reality.narrativeAhead", { tone: toneMessage, z: zFormatted }),
      );
      break;
    case "price_ahead_of_narrative":
      findings.push(msg("reality.priceAhead", { tone: toneMessage, z: zFormatted }));
      break;
    case "insufficient_evidence":
      findings.push(msg("reality.insufficient"));
      break;
  }

  // Confidence tracks the quality of the evidence, and the twin's fit is the
  // binding constraint: a poorly fitted shadow makes the z-score unreliable
  // however much news there is.
  let confidence: RealityCheck["confidence"];
  if (shadow.fitQuality >= 0.5 && news.length >= 8 && shadow.constituents.length >= 4) {
    confidence = "high";
  } else if (shadow.fitQuality >= 0.3 && news.length >= MIN_ARTICLES) {
    confidence = "moderate";
  } else {
    confidence = "low";
  }

  caveats.push(msg("reality.caveat.lexicon"));
  caveats.push(msg("reality.caveat.notAdvice"));
  if (shadow.fitQuality < 0.5) {
    caveats.push(
      msg("reality.caveat.weakFit", { percent: (shadow.fitQuality * 100).toFixed(0) }),
    );
  }
  if (news.length < 8) {
    caveats.push(
      msg("reality.caveat.fewArticles", {
        count: news.length,
        plural: news.length === 1 ? "" : "s",
      }),
    );
  }
  for (const warning of shadow.warnings) caveats.push(warning);

  return {
    verdict,
    confidence,
    narrative: {
      tone,
      articleCount: news.length,
      positiveShare,
      dominantDimensions: dominantDimensions(news),
    },
    price: {
      idiosyncratic: shadow.attribution.idiosyncratic,
      zScore: z,
      fitQuality: shadow.fitQuality,
    },
    findings,
    caveats,
  };
}
