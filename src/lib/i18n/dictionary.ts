/**
 * Translation dictionary.
 *
 * Flat, dot-namespaced keys (e.g. "nav.compare") rather than nested objects:
 * a flat key is trivially diffable between the two locale files, and a
 * missing translation is a single string comparison to detect rather than a
 * recursive object walk.
 *
 * Values with placeholders use {name} interpolation, filled by `t()`. English
 * is the source of truth; every Indonesian entry is written to match it key
 * for key, verified by a test that diffs the two key sets.
 *
 * Following the product's stated style, market-standard financial terms stay
 * in English inside the Indonesian text (dividend yield, market cap, z-score,
 * conviction, foreign flow), matching how Indonesian financial media writes
 * them. Connecting words and explanations are in Indonesian.
 */

export const en = {
  // Navigation and chrome
  "nav.analyse": "Analyse",
  "nav.compare": "Compare",
  "nav.watchlist": "Watchlist",
  "nav.signIn": "Sign in",
  "nav.signOut": "Sign out",
  "nav.skipToContent": "Skip to content",
  "theme.switchToDark": "Switch to dark mode",
  "theme.switchToLight": "Switch to light mode",
  "language.label": "Language",
  "footer.disclaimer":
    "Market data from the Sectors API. SHADOW IDX reports what has already happened in price and news. It does not forecast returns and it is not investment advice.",

  // Search
  "search.placeholder": "Search a ticker or company, for example BBRI",
  "search.button": "Analyse",
  "search.analysing": "Analysing",
  "search.invalidTicker": "An IDX ticker is four letters, for example BBRI.",
  "search.tryLabel": "Try",
  "search.resultsLabel": "Matching stocks",
  "search.moreResults": "{count} more, keep typing to narrow it down",
  "search.loading": "Searching",

  // Home page
  "home.title": "Every stock has a shadow",
  "home.description":
    "When a stock moves, most of that move usually belongs to the market or to its sector. SHADOW IDX builds a synthetic twin from comparable companies and shows you the part that is genuinely its own.",
  "home.emptyTitle": "Enter a ticker to begin",
  "home.emptyDescription":
    "Try BBRI, BBCA, TLKM, or any four letter IDX ticker. The first analysis of a stock takes a moment while its peer data is fetched.",
  "home.buildingTwin":
    "Building the synthetic twin for {symbol}. This fetches peer price history, so it can take a few seconds.",

  // Analysis view
  "analysis.asOf": "As of {date}",
  "analysis.sessions": "{count} sessions",
  "analysis.noTwinTitle": "No reliable twin could be built for {symbol}",
  "analysis.noTwinFallback":
    "There was not enough comparable data to construct a synthetic twin.",
  "analysis.attributionTitle": "Actual against its twin",
  "analysis.attributionDescription":
    "Cumulative return of the stock compared with a portfolio of its closest peers.",
  "analysis.breakdownTitle": "Where the move came from",
  "analysis.breakdownDescription":
    "The total return split into what the market, the peers, and the company itself explain.",
  "analysis.twinTitle": "What the twin is made of",
  "analysis.twinDescription": "Every peer, its weight, and why it qualified.",
  "analysis.keyStatsTitle": "Key statistics",
  "analysis.keyStatsDescription":
    "Valuation, performance, and income figures for this company.",
  "analysis.actionsTitle": "Corporate actions",
  "analysis.actionsDescription":
    "Dividends, splits, and meetings, with what each does to a holding.",
  "analysis.seasonalityTitle": "Seasonality",
  "analysis.seasonalityDescription":
    "How this stock has behaved by calendar month, with the years behind each figure.",
  "analysis.smartMoneyTitle": "Smart money positioning",
  "analysis.smartMoneyDescription":
    "Whether institutional and foreign money is moving with the price or against it.",
  "analysis.dataNotes": "Data notes",
  "analysis.whatThisDoesNotTellYou": "What this does not tell you",
  "analysis.error.invalidSymbol": "Check the ticker and try again.",
  "analysis.error.noData":
    "This ticker may be newly listed or suspended. Try a stock with a longer trading history.",
  "analysis.error.creditsExhausted":
    "The Sectors API credit budget for this build has been spent. Cached analyses are still available.",
  "analysis.error.upstream":
    "The Sectors API did not return data for this ticker. This is usually temporary.",
  "analysis.error.generic":
    "Something went wrong while building the analysis. Try again in a moment.",
  "analysis.error.genericTitle": "Could not analyse {symbol}",
  "analysis.notice.noPeers":
    "The company report for {symbol} listed no peers, so no twin could be constructed.",
  "analysis.notice.peerSkipped":
    "Peer {symbol} was skipped because its data could not be loaded.",
  "analysis.notice.indexUnavailable":
    "IHSG history was unavailable, so the market component of the attribution is reported as zero.",
  "analysis.notice.newsUnavailable":
    "Recent news could not be loaded, so the reality check uses price data only.",
  "analysis.notice.actionsUnavailable":
    "Corporate actions could not be loaded for this stock.",
  "analysis.notice.smartMoneyUnavailable":
    "Foreign flow and ownership data were unavailable, so no positioning signal was produced.",

  // Verdict panel
  "verdict.divergence.extreme": "Extreme divergence",
  "verdict.divergence.significant": "Significant divergence",
  "verdict.divergence.moderate": "Moderate divergence",
  "verdict.divergence.normal": "Within normal range",
  "verdict.divergence.aligned": "Tracking its twin",
  "verdict.divergence.extreme.meaning":
    "The stock has broken from its twin by more than three standard deviations. Moves this size are rare and usually have a specific cause.",
  "verdict.divergence.significant.meaning":
    "The stock is moving well beyond what its peers explain. Worth understanding before acting on the price.",
  "verdict.divergence.moderate.meaning":
    "There is a gap between the stock and its twin, but not beyond its usual range.",
  "verdict.divergence.normal.meaning":
    "The stock is behaving roughly as its peers would predict. Nothing here needs explaining.",
  "verdict.divergence.aligned.meaning":
    "The stock is doing what comparable companies are doing. Its move is not its own.",
  "verdict.reality.confirmed": "News and price agree",
  "verdict.reality.contradiction": "News contradicts price",
  "verdict.reality.narrativeAhead": "Story ahead of the tape",
  "verdict.reality.priceAhead": "Price ahead of the story",
  "verdict.reality.insufficient": "Not enough evidence",
  "verdict.confidence": "{level} confidence",
  "verdict.confidence.high": "high",
  "verdict.confidence.moderate": "moderate",
  "verdict.confidence.low": "low",
  "verdict.stat.stockSpecific": "Stock specific",
  "verdict.stat.zScore": "Divergence z score",
  "verdict.stat.twinFit": "Twin fit",
  "verdict.stat.weak": "weak",
  "verdict.stat.peersUsed": "Peers used",

  // Attribution bar
  "attribution.totalReturn": "Total return over window",
  "attribution.market": "Market",
  "attribution.marketDescription": "Explained by IHSG, scaled by this stock's beta",
  "attribution.sector": "Sector and peers",
  "attribution.sectorDescription": "Explained by the synthetic twin, beyond the market",
  "attribution.specific": "Stock specific",
  "attribution.specificDescription": "Unexplained by either. This is the signal",
  "attribution.footnote": "The three components sum to the total return by construction.",

  // Divergence chart
  "chart.notEnoughHistory": "Not enough overlapping history to plot a twin.",
  "chart.actual": "{symbol} actual",
  "chart.syntheticTwin": "Synthetic twin",
  "chart.divergenceCaption": "Shaded area is the divergence between them",
  "chart.ariaLabel":
    "Cumulative return of {symbol} against its synthetic twin. The twin ends at {twinPct} percent and {symbol} ends at {actualPct} percent, a gap of {gapPct} percentage points.",

  // Twin composition
  "twin.noneQualified":
    "No peer cleared the similarity threshold, so no twin was constructed.",
  "shadow.warning.insufficientHistory":
    "Insufficient overlapping price history ({available} of {required} sessions required).",
  "shadow.warning.noPeerQualified":
    "No peer cleared the similarity threshold, so no reliable twin could be built.",
  "shadow.warning.fewPeers":
    "Twin built from only {count} peer{plural}; divergence is less reliable than usual.",
  "shadow.warning.weakFit":
    "Twin explains only {percent}% of price variation; treat the divergence as indicative, not conclusive.",
  "shadow.warning.fewSessions":
    "Fewer than 20 prior sessions; the z-score is reported as zero.",
  "twin.similarity": "similarity {value}",
  "twin.correlation": "correlation {value}",
  "twin.weightFootnote":
    "Weights are proportional to squared similarity, then rescaled so the twin matches the target's volatility.",
  "twin.constituentAriaLabel":
    "{symbol} carries {weightPct} percent of the twin, with a similarity of {similarityPct} percent.",
  "twin.dimension.correlation": "Price correlation",
  "twin.dimension.sector": "Sub sector",
  "twin.dimension.marketCap": "Market cap",
  "twin.dimension.volatility": "Volatility",
  "twin.dimension.growth": "Growth",
  "twin.dimension.dividend": "Dividend",

  // Key stats
  "keystats.range52w": "52 week range",
  "keystats.rangeAriaLabel":
    "The price sits {percent} percent of the way between its 52 week low of {low} and its high of {high}.",
  "keystats.groupMarket": "Market",
  "keystats.groupValuation": "Valuation",
  "keystats.groupPerformance": "Performance",
  "keystats.groupIncome": "Income and leverage",
  "keystats.lastClose": "Last close",
  "keystats.dailyChange": "Daily change",
  "keystats.marketCap": "Market cap",
  "keystats.volatility": "Annualised volatility",
  "keystats.volatilityHint":
    "Spread of daily returns over the window, scaled to a year.",
  "keystats.pe": "Price to earnings",
  "keystats.peHint": "Price relative to annual profit per share.",
  "keystats.pb": "Price to book",
  "keystats.peerPe": "Peer average PE",
  "keystats.peerPeHint": "What comparable companies trade at, for context.",
  "keystats.eps": "Earnings per share",
  "keystats.revenueGrowth": "Revenue growth",
  "keystats.revenueGrowthHint":
    "Latest quarter against the same quarter a year earlier.",
  "keystats.earningsGrowth": "Earnings growth",
  "keystats.roe": "Return on equity",
  "keystats.roeHint": "Profit generated per rupiah of shareholder capital.",
  "keystats.netMargin": "Net margin",
  "keystats.dividendYield": "Dividend yield",
  "keystats.dividendYieldHint":
    "Dividends over the last twelve months against the price.",
  "keystats.payoutRatio": "Payout ratio",
  "keystats.payoutRatioHint":
    "Share of profit paid out. Above 100% is paid from reserves.",
  "keystats.debtToEquity": "Debt to equity",
  "keystats.debtToEquityBank":
    "Customer deposits count as liabilities, so this runs high for banks by nature.",
  "keystats.debtToEquityGeneral": "Liabilities against shareholder capital.",
  "keystats.employees": "Employees",
  "keystats.notReported": "not reported",

  // Corporate actions
  "actions.noneRecorded":
    "No dividends, splits, or meetings on record for this stock.",
  "actions.dueToPosition": "Due to your position",
  "actions.dueFootnote": "From upcoming dividends, before tax.",
  "actions.upcoming": "Upcoming",
  "actions.recent": "Recent",
  "actions.noPositionHint":
    "Add this stock to your watchlist with a position to see these effects in rupiah rather than as ratios.",
  "actions.kind.dividend": "dividend",
  "actions.kind.stockSplit": "stock split",
  "actions.kind.agm": "agm",
  "actions.receiveCash": "You receive {amount} before tax.",
  "actions.becomesShares":
    "Your holding becomes {shares} shares at {price} each.",
  "actions.dividendSummary": "Dividend of {amount} per share",
  "actions.dividendAnnounced": "Dividend announced",
  "actions.splitSummary": "Stock split, {ratio}:1",
  "actions.reverseSplitSummary": "Reverse split, 1:{ratio}",
  "actions.splitDetail":
    "The total value of the position does not change. Share count and cost per share move in opposite directions.",
  "actions.exDateDetail":
    "Ex date {date}. Shares must be held before this date to qualify.",
  "actions.agmSummary": "General meeting of shareholders",
  // Pass-through for free text supplied directly by an exchange filing
  // (agm_result), which is not one of our own sentences and is not
  // translated; the template exists only so it can travel through the
  // Message system like every other detail line.
  "actions.freeTextDetail": "{text}",

  // Seasonality
  "seasonality.notEnoughHistory":
    "Not enough price history to compute monthly statistics.",
  "seasonality.summary":
    "Across {years} years of history, {best} has been the strongest month at {bestReturn} on average and {worst} the weakest at {worstReturn}.",
  "seasonality.notPredictive":
    "Seasonality describes what happened in past calendar months. It carries no information about what any future month will do.",
  "seasonality.partialView":
    "Only {available} of 12 calendar months appear in the available price history, so this is a partial view rather than a full seasonal profile.",
  "seasonality.someUnreliable":
    "{count} of {total} months have fewer than {minYears} years of data and are shown without being called a tendency.",
  "seasonality.noneReliable":
    "No month has at least {minYears} years of history, so nothing here is described as a seasonal tendency.",
  "seasonality.inconsistent":
    "For several months the spread of outcomes is more than twice the average, so the average is not a reliable description of a typical year.",
  "seasonality.month.1": "January",
  "seasonality.month.2": "February",
  "seasonality.month.3": "March",
  "seasonality.month.4": "April",
  "seasonality.month.5": "May",
  "seasonality.month.6": "June",
  "seasonality.month.7": "July",
  "seasonality.month.8": "August",
  "seasonality.month.9": "September",
  "seasonality.month.10": "October",
  "seasonality.month.11": "November",
  "seasonality.month.12": "December",
  "seasonality.hitRateOf": "{percent}% of {years}",
  "seasonality.monthAriaLabel":
    "{month}: average {avgReturn} across {years} {yearLabel}, positive in {hitRate} percent of them.{reliabilityNote}",
  "seasonality.year.singular": "year",
  "seasonality.year.plural": "years",
  "seasonality.tooFewYears": " Too few years to describe as a tendency.",

  // Smart money
  "smartmoney.notEnoughData":
    "Not enough flow or ownership history to score positioning for this stock.",
  "smartmoney.caveat.insufficientData":
    "Not enough flow or ownership history to score positioning. No signal is reported rather than a weak guess.",
  "smartmoney.type.bullish": "Bullish divergence",
  "smartmoney.type.bearish": "Bearish divergence",
  "smartmoney.type.confirmedUp": "Confirmed by flow",
  "smartmoney.type.confirmedDown": "Confirmed by flow",
  "smartmoney.type.none": "No divergence",
  "smartmoney.meaning.bullish":
    "The price fell while institutional and foreign money accumulated. Someone is buying what the market is selling.",
  "smartmoney.meaning.bearish":
    "The price rose while institutional and foreign money reduced exposure. The rally is being sold into.",
  "smartmoney.meaning.confirmedUp":
    "Price and positioning both point up, so flow agrees with the move rather than contradicting it.",
  "smartmoney.meaning.confirmedDown":
    "Price and positioning both point down. The decline is backed by real outflows, not thin trading.",
  "smartmoney.meaning.none":
    "Positioning and price are not far enough apart to call a divergence.",
  "smartmoney.conviction": "conviction {value}",
  "smartmoney.convictionFootnote":
    "Strength of the observed disagreement, not a probability of future return.",
  "smartmoney.priceOverWindow": "Price over window",
  "smartmoney.netForeignFlow": "Net foreign flow",
  "smartmoney.flowIntensity": "Flow intensity",
  "smartmoney.flowIntensityHint": "share of traded value",
  "smartmoney.institutionalShare": "Institutional share",
  "smartmoney.institutionalShareHint": "over {months} months",
  "smartmoney.notAvailable": "not available",
  "smartmoney.summaryLine":
    "Over the window the price moved {priceReturn} while net foreign flow was {flowValue}, {flowIntensity} of traded value.",
  "smartmoney.ownershipLine":
    "Institutional ownership changed by {shareChange} percentage points across {months} monthly snapshots, while retail changed by {retailChange} points.",
  "smartmoney.caveat.scope":
    "Positioning is measured from foreign flow and institutional ownership categories. It does not include director or commissioner dealings, which this data source does not publish.",
  "smartmoney.caveat.notForecast":
    "Conviction scores the strength of the observed disagreement, not the probability of a future return. These thresholds are stated assumptions, not backtested parameters.",
  "smartmoney.caveat.flowOnly":
    "No usable ownership snapshots, so the signal rests on foreign flow alone.",
  "smartmoney.caveat.notPersistent":
    "Flow direction is not persistent, so it may be a single large trade.",

  // Reality check findings (assembled from parts, see lib/analysis/reality-check)
  "reality.attribution":
    "Of the total move, {marketPct}% traces to the market, {sectorPct}% to comparable companies, and {idioPct}% is specific to {symbol}.",
  "reality.confirmed":
    "Coverage leans {tone} and the stock-specific move runs the same way (z = {z}). The two independent signals agree.",
  "reality.contradiction":
    "Coverage leans {tone}, but the stock-specific move runs the opposite way (z = {z}). One of the two is wrong, and the disagreement itself is the signal.",
  "reality.narrativeAhead":
    "Coverage leans {tone}, yet the price is doing nothing its peers are not already doing (z = {z}). The story is not visible in the tape.",
  "reality.priceAhead":
    "The stock is making a move its peers do not explain (z = {z}) while coverage is {tone}. Price is moving before the story is public.",
  "reality.insufficient":
    "Neither coverage nor price movement is strong enough to support a conclusion. No signal is the honest answer here.",
  "reality.tone.positive": "positive",
  "reality.tone.negative": "negative",
  "reality.tone.mixed": "mixed",
  "reality.tone.quiet": "quiet",
  "reality.caveat.lexicon":
    "Tone is measured with a keyword lexicon, not a language model. It detects wording, not meaning, and will misread sarcasm, negation, and quoted claims.",
  "reality.caveat.notAdvice":
    "This compares what has already happened in news and price. It is not a forecast, and it is not investment advice.",
  "reality.caveat.weakFit":
    "The synthetic twin explains {percent}% of price variation, so the stock-specific figure carries real uncertainty.",
  "reality.caveat.fewArticles":
    "Only {count} article{plural} in the window; tone is easily skewed by a single outlet.",

  // Comparison page
  "compare.title": "Compare stocks",
  "compare.description":
    "Ranking by return tells you which sector did well. Ranking by divergence tells you which companies are doing something their peers are not.",
  "compare.emptyTitle": "Add up to four tickers",
  "compare.emptyDescription": "Enter {min} to {max} IDX tickers to compare how far each has moved from its own twin.",
  "compare.buildingTwins":
    "Building a twin for {count} {label}. Each one fetches its own peer history, so this takes a moment.",
  "compare.stockLabelSingular": "stock",
  "compare.stockLabelPlural": "stocks",
  "compare.addTicker": "Add a ticker",
  "compare.add": "Add",
  "compare.compareButton": "Compare",
  "compare.comparing": "Comparing",
  "compare.remove": "Remove {symbol}",
  "compare.errorDuplicate": "{symbol} is already in the comparison.",
  "compare.errorMax": "You can compare up to {max} stocks at once.",
  "compare.errorMin": "Add at least {min} tickers to compare.",
  "compare.notComparedTitle": "Not compared",
  "compare.howToRead": "How to read this",
  "compare.rankingCaveat":
    "Stocks are ranked by how far each has moved from its own twin, not by return. A large return that its peers also produced carries no information about the company.",
  "compare.weakFitCaveat":
    "For {symbols}, the twin explains less than 30% of price variation, so its divergence figure is indicative rather than conclusive.",
  "compare.tableStock": "Stock",
  "compare.tableTotal": "Total",
  "compare.tableMarket": "Market",
  "compare.tablePeers": "Peers",
  "compare.tableSpecific": "Stock specific",
  "compare.tableZScore": "Z score",
  "compare.tableFit": "Fit",
  "compare.tableVerdict": "Verdict",
  "compare.tableCaption":
    "Stocks ranked by how far each has diverged from its synthetic twin.",
  "compare.noneUsable":
    "None of the selected stocks produced a usable twin.",
  "compare.noTwinReason": "No twin could be constructed for this stock.",
  "compare.analysisFailedReason": "Could not analyse {symbol}.",

  // Watchlist
  "watchlist.title": "Watchlist",
  "watchlist.description":
    "You are alerted when a stock moves beyond what comparable companies explain, not when it simply moves. Set the bar per stock.",
  "watchlist.signedOutDescription":
    "Track stocks and receive an alert when one moves beyond what comparable companies explain. Alerts are deliberately rare: a notification people learn to ignore is worse than none at all.",
  "watchlist.signInPrompt": "Sign in to build a watchlist",
  "watchlist.signInDescription":
    "Your watchlist, positions, and alert thresholds are stored against your account.",
  "watchlist.createAccount": "Create an account",
  "watchlist.trackedTitle": "Tracked stocks",
  "watchlist.trackedDescription":
    "Each stock carries its own alert threshold, measured in standard deviations of its own divergence history.",
  "watchlist.alertsTitle": "Recent alerts",
  "watchlist.alertsDescription":
    "Alerts are rate limited, so a stock parked above its threshold produces one notification rather than one per run.",
  "watchlist.addTickerPlaceholder": "Add a ticker",
  "watchlist.add": "Add",
  "watchlist.adding": "Adding",
  "watchlist.showPosition": "Add your position, optional",
  "watchlist.hidePosition": "Hide position",
  "watchlist.lots": "Lots",
  "watchlist.avgPrice": "Average price",
  "watchlist.positionHint":
    "A position lets corporate actions be shown in rupiah rather than as ratios. One lot is 100 shares.",
  "watchlist.empty": "No stocks tracked yet. Add one above to start receiving alerts.",
  "watchlist.lotsAt": "{lots} lots at Rp {price}",
  "watchlist.lastAlert": "Last alert {date}",
  "watchlist.remove": "Remove",
  "watchlist.alertAbove": "Alert above",
  "watchlist.sigma": "{value} sigma",
  "watchlist.saveThreshold": "Save threshold",
  "watchlist.saving": "Saving",
  "watchlist.meaning.exceptional": "Only exceptional moves. Expect an alert a few times a year.",
  "watchlist.meaning.rare": "Rare moves. Expect an alert every month or two.",
  "watchlist.meaning.unusual": "Unusual moves. Expect an alert every few weeks.",
  "watchlist.meaning.mild": "Mildly unusual moves. Expect alerts often.",
  "watchlist.meaning.frequent": "Almost any deviation. Expect frequent alerts.",
  "watchlist.noAlertsYet": "No alerts yet.",
  "watchlist.noAlertsHint":
    "This is the expected state most of the time. Alerts fire only when a stock moves beyond what its peers explain, which is uncommon by design.",
  "watchlist.kind.divergence": "divergence",
  "watchlist.kind.corporateAction": "corporate action",
  "watchlist.kind.smartMoney": "smart money",
  "watchlist.tickerLabel": "Ticker",
  "watchlist.action.signInRequired": "Sign in to manage your watchlist.",
  "watchlist.action.checkValues": "Check the values and try again.",
  "watchlist.action.alreadyTracked": "{symbol} is already on your watchlist.",
  "watchlist.action.added": "{symbol} added to your watchlist.",
  "watchlist.action.unknownTicker": "Unknown ticker.",
  "watchlist.action.removed": "{symbol} removed.",
  "watchlist.action.thresholdRange": "The alert threshold must be between 0.5 and 6.",
  "watchlist.action.thresholdUpdated": "Alert threshold updated.",

  // Auth
  "auth.name": "Name, optional",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.passwordHint": "At least 10 characters. Length matters more than symbols.",
  "auth.working": "Working",
  "auth.createAccount": "Create account",
  "auth.signIn": "Sign in",
  "auth.alreadyHaveAccount": "Already have an account?",
  "auth.noAccountYet": "No account yet?",
  "auth.createOne": "Create one",
  "auth.signInTitle": "Sign in",
  "auth.signInSubtitle": "Your watchlist and alert settings are stored against your account.",
  "auth.signUpTitle": "Create an account",
  "auth.signUpSubtitle": "Track stocks and receive an alert when one breaks away from its twin.",
  "auth.error.invalidEmail": "Enter a valid email address.",
  "auth.error.passwordRequired": "Enter your password.",
  "auth.error.notRecognised": "That email and password combination is not recognised.",
  "auth.error.couldNotCreate": "That account could not be created. Try signing in instead.",
  "auth.error.passwordTooShort": "Use at least 10 characters. Length matters more than symbols.",
  "auth.error.passwordTooLong": "That password is too long.",

  // Alerts (in-app and email). Assembled server-side with no active browser
  // session, so these use the recipient's stored locale rather than a cookie.
  "alert.divergenceTitle": "{symbol} is trading {magnitude}% {direction} its twin",
  "alert.direction.above": "above",
  "alert.direction.below": "below",
  "alert.divergenceSummary":
    "{symbol} has moved {magnitude}% {direction} what its {peerCount} closest peers would predict, a divergence of {zScore} standard deviations.",
  "alert.reality.priceAhead": "No news explains this yet. The price is moving before the story.",
  "alert.reality.contradiction":
    "Coverage points the other way, so the story and the tape disagree.",
  "alert.reality.confirmed": "Recent coverage points the same way, so the two signals agree.",
  "alert.reality.narrativeAhead":
    "Coverage has been active but the price had not reflected it until now.",
  "alert.reality.insufficient": "There is little coverage to corroborate the move either way.",
  "alert.fitAndConfidence": "Twin fit {fitPct}%, confidence {confidence}.",
  "alert.actionTitle": "{symbol}: {summary} on {date}",
  "alert.actionDueCash": "Your position is due approximately {amount} before tax.",
  "alert.actionBecomesShares":
    "Your holding becomes {shares} shares at an adjusted cost of {price} each. The total value does not change.",

  // Digest email
  "email.greeting.named": "Hello {name},",
  "email.greeting.anonymous": "Hello,",
  "email.subjectSingle": "{title}",
  "email.subjectMultiple": "{count} stocks on your watchlist have moved away from their twins",
  "email.intro": "These stocks have moved beyond what comparable companies explain.",
  "email.omittedNote": "{count} further {label} not included in this digest.",
  "email.omitted.singular": "alert was",
  "email.omitted.plural": "alerts were",
  "email.footer.disclaimer":
    "SHADOW IDX reports what has already happened in price and news. It does not forecast returns and it is not investment advice. You are receiving this because you added these stocks to your watchlist.",
} as const;

export type TranslationKey = keyof typeof en;

export const id: Record<TranslationKey, string> = {
  "nav.analyse": "Analisis",
  "nav.compare": "Bandingkan",
  "nav.watchlist": "Watchlist",
  "nav.signIn": "Masuk",
  "nav.signOut": "Keluar",
  "nav.skipToContent": "Langsung ke konten",
  "theme.switchToDark": "Beralih ke mode gelap",
  "theme.switchToLight": "Beralih ke mode terang",
  "language.label": "Bahasa",
  "footer.disclaimer":
    "Data pasar dari Sectors API. SHADOW IDX melaporkan apa yang sudah terjadi pada harga dan berita. Ini bukan prediksi return dan bukan saran investasi.",

  "search.placeholder": "Cari kode saham atau nama perusahaan, misalnya BBRI",
  "search.button": "Analisis",
  "search.analysing": "Menganalisis",
  "search.invalidTicker": "Kode saham IDX terdiri dari empat huruf, misalnya BBRI.",
  "search.tryLabel": "Coba",
  "search.resultsLabel": "Saham yang cocok",
  "search.moreResults": "{count} lagi, lanjutkan mengetik untuk mempersempit",
  "search.loading": "Mencari",

  "home.title": "Setiap saham punya bayangannya",
  "home.description":
    "Saat sebuah saham bergerak, sebagian besar pergerakan itu biasanya milik market atau sektornya. SHADOW IDX membangun synthetic twin dari perusahaan sebanding dan menunjukkan bagian yang benar-benar milik saham itu sendiri.",
  "home.emptyTitle": "Masukkan kode saham untuk memulai",
  "home.emptyDescription":
    "Coba BBRI, BBCA, TLKM, atau kode saham IDX empat huruf apa pun. Analisis pertama pada suatu saham memerlukan waktu sesaat karena data peer-nya sedang diambil.",
  "home.buildingTwin":
    "Membangun synthetic twin untuk {symbol}. Proses ini mengambil riwayat harga peer, jadi bisa memakan waktu beberapa detik.",

  "analysis.asOf": "Per {date}",
  "analysis.sessions": "{count} sesi",
  "analysis.noTwinTitle": "Twin yang andal tidak dapat dibangun untuk {symbol}",
  "analysis.noTwinFallback":
    "Data pembanding tidak cukup untuk membangun synthetic twin.",
  "analysis.attributionTitle": "Aktual dibandingkan twin-nya",
  "analysis.attributionDescription":
    "Cumulative return saham dibandingkan dengan portofolio peer terdekatnya.",
  "analysis.breakdownTitle": "Asal pergerakan harga",
  "analysis.breakdownDescription":
    "Total return dipecah menjadi bagian yang dijelaskan oleh market, peer, dan perusahaan itu sendiri.",
  "analysis.twinTitle": "Komposisi twin",
  "analysis.twinDescription": "Setiap peer, bobotnya, dan alasan ia memenuhi syarat.",
  "analysis.keyStatsTitle": "Statistik kunci",
  "analysis.keyStatsDescription":
    "Angka valuasi, performa, dan pendapatan untuk perusahaan ini.",
  "analysis.actionsTitle": "Corporate action",
  "analysis.actionsDescription":
    "Dividen, stock split, dan RUPS, beserta efeknya terhadap posisi Anda.",
  "analysis.seasonalityTitle": "Seasonality",
  "analysis.seasonalityDescription":
    "Bagaimana saham ini berperilaku per bulan kalender, lengkap dengan jumlah tahun di balik tiap angka.",
  "analysis.smartMoneyTitle": "Smart money positioning",
  "analysis.smartMoneyDescription":
    "Apakah dana institusi dan asing bergerak searah dengan harga atau justru berlawanan.",
  "analysis.dataNotes": "Catatan data",
  "analysis.whatThisDoesNotTellYou": "Yang tidak ditunjukkan analisis ini",
  "analysis.error.invalidSymbol": "Periksa kembali kode sahamnya dan coba lagi.",
  "analysis.error.noData":
    "Saham ini mungkin baru saja listing atau sedang disuspensi. Coba saham dengan riwayat perdagangan lebih panjang.",
  "analysis.error.creditsExhausted":
    "Jatah kredit Sectors API untuk build ini sudah habis. Analisis yang sudah tersimpan di cache tetap dapat diakses.",
  "analysis.error.upstream":
    "Sectors API tidak mengembalikan data untuk kode saham ini. Biasanya ini bersifat sementara.",
  "analysis.error.generic":
    "Terjadi kesalahan saat membangun analisis. Coba lagi sesaat lagi.",
  "analysis.error.genericTitle": "Tidak dapat menganalisis {symbol}",
  "analysis.notice.noPeers":
    "Laporan perusahaan untuk {symbol} tidak mencantumkan peer, sehingga twin tidak dapat dibangun.",
  "analysis.notice.peerSkipped":
    "Peer {symbol} dilewati karena datanya tidak dapat dimuat.",
  "analysis.notice.indexUnavailable":
    "Riwayat IHSG tidak tersedia, sehingga komponen market pada attribution dilaporkan sebagai nol.",
  "analysis.notice.newsUnavailable":
    "Berita terbaru tidak dapat dimuat, sehingga reality check hanya menggunakan data harga.",
  "analysis.notice.actionsUnavailable":
    "Corporate action tidak dapat dimuat untuk saham ini.",
  "analysis.notice.smartMoneyUnavailable":
    "Data foreign flow dan ownership tidak tersedia, sehingga sinyal positioning tidak dapat dihasilkan.",

  "verdict.divergence.extreme": "Divergensi ekstrem",
  "verdict.divergence.significant": "Divergensi signifikan",
  "verdict.divergence.moderate": "Divergensi moderat",
  "verdict.divergence.normal": "Masih dalam rentang normal",
  "verdict.divergence.aligned": "Mengikuti twin-nya",
  "verdict.divergence.extreme.meaning":
    "Saham telah menyimpang dari twin-nya lebih dari tiga standar deviasi. Pergerakan sebesar ini jarang terjadi dan biasanya punya sebab spesifik.",
  "verdict.divergence.significant.meaning":
    "Saham bergerak jauh melampaui apa yang dijelaskan oleh peer-nya. Layak dipahami sebelum bertindak berdasarkan harga ini.",
  "verdict.divergence.moderate.meaning":
    "Ada selisih antara saham dan twin-nya, tapi masih dalam rentang wajarnya.",
  "verdict.divergence.normal.meaning":
    "Saham berperilaku kurang lebih sesuai prediksi peer-nya. Tidak ada yang perlu dijelaskan di sini.",
  "verdict.divergence.aligned.meaning":
    "Saham melakukan hal yang sama dengan perusahaan sebanding. Pergerakannya bukan milik sendiri.",
  "verdict.reality.confirmed": "Berita dan harga sejalan",
  "verdict.reality.contradiction": "Berita bertentangan dengan harga",
  "verdict.reality.narrativeAhead": "Narasi mendahului pergerakan harga",
  "verdict.reality.priceAhead": "Harga mendahului narasi",
  "verdict.reality.insufficient": "Bukti belum cukup",
  "verdict.confidence": "keyakinan {level}",
  "verdict.confidence.high": "tinggi",
  "verdict.confidence.moderate": "sedang",
  "verdict.confidence.low": "rendah",
  "verdict.stat.stockSpecific": "Spesifik saham",
  "verdict.stat.zScore": "Z-score divergensi",
  "verdict.stat.twinFit": "Fit twin",
  "verdict.stat.weak": "lemah",
  "verdict.stat.peersUsed": "Peer digunakan",

  "attribution.totalReturn": "Total return sepanjang periode",
  "attribution.market": "Market",
  "attribution.marketDescription": "Dijelaskan oleh IHSG, diskalakan dengan beta saham ini",
  "attribution.sector": "Sektor dan peer",
  "attribution.sectorDescription": "Dijelaskan oleh synthetic twin, di luar pengaruh market",
  "attribution.specific": "Spesifik saham",
  "attribution.specificDescription": "Tidak dijelaskan oleh keduanya. Inilah sinyalnya",
  "attribution.footnote": "Ketiga komponen ini berjumlah sama dengan total return, sesuai konstruksinya.",

  "chart.notEnoughHistory": "Riwayat yang tumpang tindih belum cukup untuk memplot twin.",
  "chart.actual": "{symbol} aktual",
  "chart.syntheticTwin": "Synthetic twin",
  "chart.divergenceCaption": "Area yang diarsir adalah divergensi antara keduanya",
  "chart.ariaLabel":
    "Cumulative return {symbol} dibandingkan synthetic twin-nya. Twin berakhir di {twinPct} persen dan {symbol} berakhir di {actualPct} persen, selisih {gapPct} poin persentase.",

  "twin.noneQualified":
    "Tidak ada peer yang melewati ambang batas similarity, sehingga twin tidak dapat dibangun.",
  "shadow.warning.insufficientHistory":
    "Riwayat harga yang tumpang tindih belum cukup ({available} dari {required} sesi yang dibutuhkan).",
  "shadow.warning.noPeerQualified":
    "Tidak ada peer yang melewati ambang batas similarity, sehingga twin yang andal tidak dapat dibangun.",
  "shadow.warning.fewPeers":
    "Twin hanya dibangun dari {count} peer; divergensinya kurang andal dibanding biasanya.",
  "shadow.warning.weakFit":
    "Twin hanya menjelaskan {percent}% variasi harga; anggap divergensi ini sebagai indikasi, bukan kesimpulan pasti.",
  "shadow.warning.fewSessions":
    "Riwayat kurang dari 20 sesi; z-score dilaporkan sebagai nol.",
  "twin.similarity": "similarity {value}",
  "twin.correlation": "korelasi {value}",
  "twin.weightFootnote":
    "Bobot proporsional terhadap similarity kuadrat, lalu diskalakan ulang agar volatilitas twin menyamai volatilitas target.",
  "twin.constituentAriaLabel":
    "{symbol} membawa {weightPct} persen bobot twin, dengan similarity {similarityPct} persen.",
  "twin.dimension.correlation": "Korelasi harga",
  "twin.dimension.sector": "Sub sektor",
  "twin.dimension.marketCap": "Market cap",
  "twin.dimension.volatility": "Volatilitas",
  "twin.dimension.growth": "Growth",
  "twin.dimension.dividend": "Dividend",

  "keystats.range52w": "Rentang 52 minggu",
  "keystats.rangeAriaLabel":
    "Harga berada di {percent} persen jarak antara level terendah 52 minggu {low} dan tertinggi {high}.",
  "keystats.groupMarket": "Market",
  "keystats.groupValuation": "Valuasi",
  "keystats.groupPerformance": "Performa",
  "keystats.groupIncome": "Pendapatan dan leverage",
  "keystats.lastClose": "Harga penutupan terakhir",
  "keystats.dailyChange": "Perubahan harian",
  "keystats.marketCap": "Market cap",
  "keystats.volatility": "Volatilitas tahunan",
  "keystats.volatilityHint":
    "Sebaran return harian sepanjang periode, diskalakan ke basis tahunan.",
  "keystats.pe": "Price to earnings",
  "keystats.peHint": "Harga relatif terhadap laba tahunan per saham.",
  "keystats.pb": "Price to book",
  "keystats.peerPe": "Rata-rata PE peer",
  "keystats.peerPeHint": "Level valuasi perusahaan sebanding, sebagai pembanding.",
  "keystats.eps": "Earnings per share",
  "keystats.revenueGrowth": "Pertumbuhan revenue",
  "keystats.revenueGrowthHint":
    "Kuartal terakhir dibandingkan kuartal yang sama tahun sebelumnya.",
  "keystats.earningsGrowth": "Pertumbuhan laba",
  "keystats.roe": "Return on equity",
  "keystats.roeHint": "Laba yang dihasilkan per rupiah modal pemegang saham.",
  "keystats.netMargin": "Net margin",
  "keystats.dividendYield": "Dividend yield",
  "keystats.dividendYieldHint":
    "Dividen dua belas bulan terakhir dibandingkan harga saat ini.",
  "keystats.payoutRatio": "Payout ratio",
  "keystats.payoutRatioHint":
    "Porsi laba yang dibagikan. Di atas 100% berarti dibayar dari cadangan.",
  "keystats.debtToEquity": "Debt to equity",
  "keystats.debtToEquityBank":
    "Simpanan nasabah tercatat sebagai liabilitas, sehingga angka ini wajar tinggi untuk bank.",
  "keystats.debtToEquityGeneral": "Liabilitas dibandingkan modal pemegang saham.",
  "keystats.employees": "Jumlah karyawan",
  "keystats.notReported": "tidak dilaporkan",

  "actions.noneRecorded":
    "Belum ada catatan dividen, stock split, atau RUPS untuk saham ini.",
  "actions.dueToPosition": "Yang menjadi hak posisi Anda",
  "actions.dueFootnote": "Dari dividen yang akan datang, sebelum pajak.",
  "actions.upcoming": "Akan datang",
  "actions.recent": "Terbaru",
  "actions.noPositionHint":
    "Tambahkan saham ini ke watchlist beserta posisinya untuk melihat efeknya dalam rupiah, bukan sekadar rasio.",
  "actions.kind.dividend": "dividend",
  "actions.kind.stockSplit": "stock split",
  "actions.kind.agm": "rups",
  "actions.receiveCash": "Anda menerima {amount} sebelum pajak.",
  "actions.becomesShares":
    "Kepemilikan Anda menjadi {shares} lembar saham seharga {price} per lembar.",
  "actions.dividendSummary": "Dividend {amount} per saham",
  "actions.dividendAnnounced": "Dividend diumumkan",
  "actions.splitSummary": "Stock split, {ratio}:1",
  "actions.reverseSplitSummary": "Reverse split, 1:{ratio}",
  "actions.splitDetail":
    "Nilai total posisi tidak berubah. Jumlah saham dan cost per saham bergerak berlawanan arah.",
  "actions.exDateDetail":
    "Ex date {date}. Saham harus sudah dimiliki sebelum tanggal ini agar memenuhi syarat.",
  "actions.agmSummary": "Rapat Umum Pemegang Saham",
  "actions.freeTextDetail": "{text}",

  "seasonality.notEnoughHistory":
    "Riwayat harga belum cukup untuk menghitung statistik bulanan.",
  "seasonality.summary":
    "Sepanjang {years} tahun riwayat, {best} menjadi bulan terkuat dengan rata-rata {bestReturn}, dan {worst} bulan terlemah dengan {worstReturn}.",
  "seasonality.notPredictive":
    "Seasonality menggambarkan apa yang terjadi pada bulan-bulan kalender di masa lalu. Ini tidak memberikan informasi apa pun tentang bulan mana pun di masa depan.",
  "seasonality.partialView":
    "Hanya {available} dari 12 bulan kalender yang tersedia dalam riwayat harga, sehingga ini adalah gambaran sebagian, bukan profil seasonality yang lengkap.",
  "seasonality.someUnreliable":
    "{count} dari {total} bulan memiliki riwayat kurang dari {minYears} tahun dan ditampilkan tanpa disebut sebagai kecenderungan.",
  "seasonality.noneReliable":
    "Tidak ada bulan dengan riwayat setidaknya {minYears} tahun, sehingga tidak ada yang disebut sebagai kecenderungan seasonality di sini.",
  "seasonality.inconsistent":
    "Pada beberapa bulan, sebaran hasilnya lebih dari dua kali rata-ratanya, sehingga rata-rata tersebut bukan gambaran yang andal untuk tahun yang tipikal.",
  "seasonality.month.1": "Januari",
  "seasonality.month.2": "Februari",
  "seasonality.month.3": "Maret",
  "seasonality.month.4": "April",
  "seasonality.month.5": "Mei",
  "seasonality.month.6": "Juni",
  "seasonality.month.7": "Juli",
  "seasonality.month.8": "Agustus",
  "seasonality.month.9": "September",
  "seasonality.month.10": "Oktober",
  "seasonality.month.11": "November",
  "seasonality.month.12": "Desember",
  "seasonality.hitRateOf": "{percent}% dari {years}",
  "seasonality.monthAriaLabel":
    "{month}: rata-rata {avgReturn} sepanjang {years} {yearLabel}, positif pada {hitRate} persen di antaranya.{reliabilityNote}",
  "seasonality.year.singular": "tahun",
  "seasonality.year.plural": "tahun",
  "seasonality.tooFewYears": " Riwayat terlalu sedikit untuk disebut sebagai kecenderungan.",

  "smartmoney.notEnoughData":
    "Riwayat foreign flow atau ownership belum cukup untuk menilai positioning saham ini.",
  "smartmoney.caveat.insufficientData":
    "Riwayat foreign flow atau ownership belum cukup untuk menilai positioning. Tidak ada sinyal, lebih baik daripada tebakan lemah.",
  "smartmoney.type.bullish": "Divergensi bullish",
  "smartmoney.type.bearish": "Divergensi bearish",
  "smartmoney.type.confirmedUp": "Dikonfirmasi flow",
  "smartmoney.type.confirmedDown": "Dikonfirmasi flow",
  "smartmoney.type.none": "Tidak ada divergensi",
  "smartmoney.meaning.bullish":
    "Harga turun sementara dana institusi dan asing justru terus terakumulasi. Ada pihak yang membeli apa yang dijual market.",
  "smartmoney.meaning.bearish":
    "Harga naik sementara dana institusi dan asing mengurangi eksposur. Rally ini sedang dijual.",
  "smartmoney.meaning.confirmedUp":
    "Harga dan positioning sama-sama naik, sehingga flow sejalan dengan pergerakan, bukan bertentangan.",
  "smartmoney.meaning.confirmedDown":
    "Harga dan positioning sama-sama turun. Penurunan ini didukung outflow yang nyata, bukan sekadar perdagangan tipis.",
  "smartmoney.meaning.none":
    "Positioning dan harga belum cukup berjauhan untuk disebut divergensi.",
  "smartmoney.conviction": "conviction {value}",
  "smartmoney.convictionFootnote":
    "Kekuatan ketidaksesuaian yang teramati, bukan probabilitas return di masa depan.",
  "smartmoney.priceOverWindow": "Harga sepanjang periode",
  "smartmoney.netForeignFlow": "Net foreign flow",
  "smartmoney.flowIntensity": "Intensitas flow",
  "smartmoney.flowIntensityHint": "porsi dari nilai transaksi",
  "smartmoney.institutionalShare": "Porsi institusi",
  "smartmoney.institutionalShareHint": "selama {months} bulan",
  "smartmoney.notAvailable": "tidak tersedia",
  "smartmoney.summaryLine":
    "Sepanjang periode harga bergerak {priceReturn} sementara net foreign flow sebesar {flowValue}, {flowIntensity} dari nilai transaksi.",
  "smartmoney.ownershipLine":
    "Kepemilikan institusi berubah {shareChange} poin persentase sepanjang {months} snapshot bulanan, sementara ritel berubah {retailChange} poin.",
  "smartmoney.caveat.scope":
    "Positioning diukur dari foreign flow dan kategori kepemilikan institusi. Ini tidak mencakup transaksi direksi atau komisaris, karena sumber data ini tidak mempublikasikannya.",
  "smartmoney.caveat.notForecast":
    "Conviction menilai kekuatan ketidaksesuaian yang teramati, bukan probabilitas return di masa depan. Ambang batas ini adalah asumsi yang dinyatakan, bukan parameter hasil backtest.",
  "smartmoney.caveat.flowOnly":
    "Tidak ada snapshot ownership yang dapat digunakan, sehingga sinyal ini hanya bersandar pada foreign flow.",
  "smartmoney.caveat.notPersistent":
    "Arah flow tidak persisten, sehingga bisa jadi hanya satu transaksi besar.",

  "reality.attribution":
    "Dari total pergerakan, {marketPct}% berasal dari market, {sectorPct}% dari perusahaan sebanding, dan {idioPct}% spesifik milik {symbol}.",
  "reality.confirmed":
    "Coverage cenderung {tone} dan pergerakan spesifik saham searah dengannya (z = {z}). Kedua sinyal independen ini sejalan.",
  "reality.contradiction":
    "Coverage cenderung {tone}, tetapi pergerakan spesifik saham justru berlawanan arah (z = {z}). Salah satu dari keduanya keliru, dan ketidaksesuaian ini sendiri adalah sinyalnya.",
  "reality.narrativeAhead":
    "Coverage cenderung {tone}, namun harga tidak melakukan apa pun yang belum dilakukan peer-nya (z = {z}). Narasinya belum terlihat pada pergerakan harga.",
  "reality.priceAhead":
    "Saham ini bergerak dengan cara yang tidak dijelaskan peer-nya (z = {z}) sementara coverage-nya {tone}. Harga bergerak lebih dulu sebelum berita muncul ke publik.",
  "reality.insufficient":
    "Baik coverage maupun pergerakan harga belum cukup kuat untuk mendukung kesimpulan. Tidak ada sinyal adalah jawaban paling jujur di sini.",
  "reality.tone.positive": "positif",
  "reality.tone.negative": "negatif",
  "reality.tone.mixed": "campuran",
  "reality.tone.quiet": "sepi",
  "reality.caveat.lexicon":
    "Tone diukur menggunakan kamus kata kunci, bukan model bahasa. Ini mendeteksi kata, bukan makna, dan bisa salah membaca sarkasme, negasi, serta kutipan pernyataan orang lain.",
  "reality.caveat.notAdvice":
    "Ini membandingkan apa yang sudah terjadi pada berita dan harga. Ini bukan prediksi, dan bukan saran investasi.",
  "reality.caveat.weakFit":
    "Synthetic twin ini hanya menjelaskan {percent}% variasi harga, sehingga angka spesifik saham ini memiliki ketidakpastian yang nyata.",
  "reality.caveat.fewArticles":
    "Hanya {count} artikel{plural} dalam periode ini; tone mudah bergeser oleh satu media saja.",

  "compare.title": "Bandingkan saham",
  "compare.description":
    "Peringkat berdasarkan return menunjukkan sektor mana yang berkinerja baik. Peringkat berdasarkan divergensi menunjukkan perusahaan mana yang melakukan sesuatu yang tidak dilakukan peer-nya.",
  "compare.emptyTitle": "Tambahkan hingga empat kode saham",
  "compare.emptyDescription": "Masukkan {min} sampai {max} kode saham IDX untuk membandingkan seberapa jauh masing-masing bergerak dari twin-nya sendiri.",
  "compare.buildingTwins":
    "Membangun twin untuk {count} {label}. Masing-masing mengambil riwayat peer-nya sendiri, jadi ini memerlukan waktu sesaat.",
  "compare.stockLabelSingular": "saham",
  "compare.stockLabelPlural": "saham",
  "compare.addTicker": "Tambah kode saham",
  "compare.add": "Tambah",
  "compare.compareButton": "Bandingkan",
  "compare.comparing": "Membandingkan",
  "compare.remove": "Hapus {symbol}",
  "compare.errorDuplicate": "{symbol} sudah ada dalam perbandingan.",
  "compare.errorMax": "Anda dapat membandingkan hingga {max} saham sekaligus.",
  "compare.errorMin": "Tambahkan minimal {min} kode saham untuk membandingkan.",
  "compare.notComparedTitle": "Tidak dibandingkan",
  "compare.howToRead": "Cara membaca ini",
  "compare.rankingCaveat":
    "Saham diperingkatkan berdasarkan seberapa jauh masing-masing bergerak dari twin-nya sendiri, bukan berdasarkan return. Return besar yang juga dihasilkan peer-nya tidak memberi informasi apa pun tentang perusahaan itu.",
  "compare.weakFitCaveat":
    "Pada {symbols}, twin hanya menjelaskan kurang dari 30% variasi harga, sehingga angka divergensinya bersifat indikatif, bukan konklusif.",
  "compare.tableStock": "Saham",
  "compare.tableTotal": "Total",
  "compare.tableMarket": "Market",
  "compare.tablePeers": "Peers",
  "compare.tableSpecific": "Spesifik saham",
  "compare.tableZScore": "Z-score",
  "compare.tableFit": "Fit",
  "compare.tableVerdict": "Verdict",
  "compare.tableCaption":
    "Saham diperingkatkan berdasarkan seberapa jauh masing-masing menyimpang dari synthetic twin-nya.",
  "compare.noneUsable":
    "Tidak ada satu pun saham terpilih yang menghasilkan twin yang dapat digunakan.",
  "compare.noTwinReason": "Twin tidak dapat dibangun untuk saham ini.",
  "compare.analysisFailedReason": "Tidak dapat menganalisis {symbol}.",

  "watchlist.title": "Watchlist",
  "watchlist.description":
    "Anda akan diberi tahu saat sebuah saham bergerak melampaui apa yang dijelaskan perusahaan sebanding, bukan sekadar saat harganya bergerak. Atur ambang batasnya per saham.",
  "watchlist.signedOutDescription":
    "Pantau saham dan terima notifikasi saat pergerakannya melampaui apa yang dijelaskan perusahaan sebanding. Notifikasi memang dibuat jarang: pemberitahuan yang diabaikan orang lebih buruk daripada tidak ada sama sekali.",
  "watchlist.signInPrompt": "Masuk untuk membangun watchlist",
  "watchlist.signInDescription":
    "Watchlist, posisi, dan ambang batas notifikasi Anda tersimpan terkait akun Anda.",
  "watchlist.createAccount": "Buat akun",
  "watchlist.trackedTitle": "Saham yang dipantau",
  "watchlist.trackedDescription":
    "Setiap saham memiliki ambang batas notifikasinya sendiri, diukur dalam standar deviasi riwayat divergensinya.",
  "watchlist.alertsTitle": "Notifikasi terbaru",
  "watchlist.alertsDescription":
    "Notifikasi dibatasi frekuensinya, sehingga saham yang berada di atas ambang batasnya hanya menghasilkan satu notifikasi, bukan satu per proses.",
  "watchlist.addTickerPlaceholder": "Tambah kode saham",
  "watchlist.add": "Tambah",
  "watchlist.adding": "Menambahkan",
  "watchlist.showPosition": "Tambahkan posisi Anda, opsional",
  "watchlist.hidePosition": "Sembunyikan posisi",
  "watchlist.lots": "Lot",
  "watchlist.avgPrice": "Harga rata-rata",
  "watchlist.positionHint":
    "Posisi memungkinkan corporate action ditampilkan dalam rupiah, bukan sekadar rasio. Satu lot sama dengan 100 lembar saham.",
  "watchlist.empty": "Belum ada saham yang dipantau. Tambahkan satu di atas untuk mulai menerima notifikasi.",
  "watchlist.lotsAt": "{lots} lot seharga Rp {price}",
  "watchlist.lastAlert": "Notifikasi terakhir {date}",
  "watchlist.remove": "Hapus",
  "watchlist.alertAbove": "Beri notifikasi di atas",
  "watchlist.sigma": "{value} sigma",
  "watchlist.saveThreshold": "Simpan ambang batas",
  "watchlist.saving": "Menyimpan",
  "watchlist.meaning.exceptional": "Hanya pergerakan luar biasa. Perkirakan notifikasi beberapa kali setahun.",
  "watchlist.meaning.rare": "Pergerakan langka. Perkirakan notifikasi setiap satu atau dua bulan.",
  "watchlist.meaning.unusual": "Pergerakan tidak biasa. Perkirakan notifikasi setiap beberapa minggu.",
  "watchlist.meaning.mild": "Pergerakan sedikit tidak biasa. Perkirakan notifikasi cukup sering.",
  "watchlist.meaning.frequent": "Hampir semua deviasi. Perkirakan notifikasi sering muncul.",
  "watchlist.noAlertsYet": "Belum ada notifikasi.",
  "watchlist.noAlertsHint":
    "Ini adalah kondisi yang diharapkan sebagian besar waktu. Notifikasi hanya muncul saat saham bergerak melampaui apa yang dijelaskan peer-nya, yang memang dirancang jarang terjadi.",
  "watchlist.kind.divergence": "divergensi",
  "watchlist.kind.corporateAction": "corporate action",
  "watchlist.kind.smartMoney": "smart money",
  "watchlist.tickerLabel": "Kode saham",
  "watchlist.action.signInRequired": "Masuk untuk mengelola watchlist Anda.",
  "watchlist.action.checkValues": "Periksa kembali nilainya dan coba lagi.",
  "watchlist.action.alreadyTracked": "{symbol} sudah ada di watchlist Anda.",
  "watchlist.action.added": "{symbol} ditambahkan ke watchlist Anda.",
  "watchlist.action.unknownTicker": "Kode saham tidak dikenali.",
  "watchlist.action.removed": "{symbol} dihapus.",
  "watchlist.action.thresholdRange": "Ambang batas notifikasi harus antara 0.5 dan 6.",
  "watchlist.action.thresholdUpdated": "Ambang batas notifikasi diperbarui.",

  "auth.name": "Nama, opsional",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.passwordHint": "Minimal 10 karakter. Panjang lebih penting daripada simbol.",
  "auth.working": "Memproses",
  "auth.createAccount": "Buat akun",
  "auth.signIn": "Masuk",
  "auth.alreadyHaveAccount": "Sudah punya akun?",
  "auth.noAccountYet": "Belum punya akun?",
  "auth.createOne": "Buat sekarang",
  "auth.signInTitle": "Masuk",
  "auth.signInSubtitle": "Watchlist dan pengaturan notifikasi Anda tersimpan terkait akun Anda.",
  "auth.signUpTitle": "Buat akun",
  "auth.signUpSubtitle": "Pantau saham dan terima notifikasi saat pergerakannya menyimpang dari twin-nya.",
  "auth.error.invalidEmail": "Masukkan alamat email yang valid.",
  "auth.error.passwordRequired": "Masukkan password Anda.",
  "auth.error.notRecognised": "Kombinasi email dan password itu tidak dikenali.",
  "auth.error.couldNotCreate": "Akun tidak dapat dibuat. Coba masuk dengan akun yang sudah ada.",
  "auth.error.passwordTooShort": "Gunakan minimal 10 karakter. Panjang lebih penting daripada simbol.",
  "auth.error.passwordTooLong": "Password tersebut terlalu panjang.",

  "alert.divergenceTitle": "{symbol} diperdagangkan {magnitude}% di {direction} twin-nya",
  "alert.direction.above": "atas",
  "alert.direction.below": "bawah",
  "alert.divergenceSummary":
    "{symbol} bergerak {magnitude}% di {direction} prediksi {peerCount} peer terdekatnya, divergensi sebesar {zScore} standar deviasi.",
  "alert.reality.priceAhead": "Belum ada berita yang menjelaskan ini. Harga bergerak lebih dulu sebelum berita muncul.",
  "alert.reality.contradiction":
    "Coverage justru menunjukkan arah sebaliknya, sehingga narasi dan pergerakan harga bertentangan.",
  "alert.reality.confirmed": "Coverage terbaru sejalan dengan pergerakan ini, kedua sinyal sepakat.",
  "alert.reality.narrativeAhead":
    "Coverage sudah aktif, tapi harga belum mencerminkannya sampai sekarang.",
  "alert.reality.insufficient": "Coverage masih terlalu sedikit untuk mendukung atau membantah pergerakan ini.",
  "alert.fitAndConfidence": "Twin fit {fitPct}%, keyakinan {confidence}.",
  "alert.actionTitle": "{symbol}: {summary} pada {date}",
  "alert.actionDueCash": "Posisi Anda berhak menerima kira-kira {amount} sebelum pajak.",
  "alert.actionBecomesShares":
    "Kepemilikan Anda menjadi {shares} lembar saham dengan cost per saham disesuaikan menjadi {price}. Nilai total tidak berubah.",

  "email.greeting.named": "Halo {name},",
  "email.greeting.anonymous": "Halo,",
  "email.subjectSingle": "{title}",
  "email.subjectMultiple": "{count} saham di watchlist Anda bergerak menjauh dari twin-nya",
  "email.intro": "Saham-saham ini bergerak melampaui apa yang dijelaskan perusahaan sebanding.",
  "email.omittedNote": "{count} {label} lainnya tidak dimuat dalam digest ini.",
  "email.omitted.singular": "notifikasi",
  "email.omitted.plural": "notifikasi",
  "email.footer.disclaimer":
    "SHADOW IDX melaporkan apa yang sudah terjadi pada harga dan berita. Ini bukan prediksi return dan bukan saran investasi. Anda menerima email ini karena menambahkan saham-saham ini ke watchlist Anda.",
};
