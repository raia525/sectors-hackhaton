import type { NewsItem } from "@/lib/sectors/schemas";
import type { ShadowAnalysis } from "@/lib/shadow/types";

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
  findings: string[];
  /** Explicit limits of this analysis, always shown alongside the verdict. */
  caveats: string[];
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

  const findings: string[] = [];
  const caveats: string[] = [];

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
    `Of the total move, ${marketPct}% traces to the market, ${sectorPct}% to comparable companies, and ${idioPct}% is specific to ${shadow.symbol}.`,
  );

  switch (verdict) {
    case "confirmed":
      findings.push(
        `Coverage leans ${tone} and the stock-specific move runs the same way (z = ${z.toFixed(2)}). The two independent signals agree.`,
      );
      break;
    case "contradiction":
      findings.push(
        `Coverage leans ${tone}, but the stock-specific move runs the opposite way (z = ${z.toFixed(2)}). One of the two is wrong, and the disagreement itself is the signal.`,
      );
      break;
    case "narrative_ahead_of_price":
      findings.push(
        `Coverage leans ${tone}, yet the price is doing nothing its peers are not already doing (z = ${z.toFixed(2)}). The story is not visible in the tape.`,
      );
      break;
    case "price_ahead_of_narrative":
      findings.push(
        `The stock is making a move its peers do not explain (z = ${z.toFixed(2)}) while coverage is ${tone}. Price is moving before the story is public.`,
      );
      break;
    case "insufficient_evidence":
      findings.push(
        "Neither coverage nor price movement is strong enough to support a conclusion. No signal is the honest answer here.",
      );
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

  caveats.push(
    "Tone is measured with a keyword lexicon, not a language model. It detects wording, not meaning, and will misread sarcasm, negation, and quoted claims.",
  );
  caveats.push(
    "This compares what has already happened in news and price. It is not a forecast, and it is not investment advice.",
  );
  if (shadow.fitQuality < 0.5) {
    caveats.push(
      `The synthetic twin explains ${(shadow.fitQuality * 100).toFixed(0)}% of price variation, so the stock-specific figure carries real uncertainty.`,
    );
  }
  if (news.length < 8) {
    caveats.push(
      `Only ${news.length} article${news.length === 1 ? "" : "s"} in the window; tone is easily skewed by a single outlet.`,
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
