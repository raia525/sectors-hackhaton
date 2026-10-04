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
 * Indonesian copy follows one glossary, so a concept has one name
 * everywhere (see AGENTS.md): kembaran for the twin, pembanding for peers,
 * kemiripan, pasar, khusus saham, aliran dana asing, liputan berita. Terms
 * Indonesian investors use as they are (return, watchlist, z-score, smart
 * money) stay in English.
 *
 * Some copy lives in server-only modules instead (see AGENTS.md).
 */

import type { AdminKey } from "./admin-dictionary";

export const en = {
  // Navigation and chrome
  "nav.analyse": "Analyse",
  "nav.compare": "Compare",
  "nav.watchlist": "Watchlist",
  "nav.brief": "Brief",
  "nav.signIn": "Sign in",
  "nav.register": "Register",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",
  "nav.expand": "Show the full menu",
  "nav.collapse": "Minimize the menu",
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
  "compare.tableFit": "Kecocokan",
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
  "auth.error.emailNotVerified":
    "Verify your email before signing in. Check your inbox for the link, or request a new one.",
  "auth.rememberMe": "Remember me for 30 days",
  "auth.forgotPassword": "Forgot your password?",

  // Sign in, gated redirect
  "auth.gate.title": "Sign in to continue",
  "auth.gate.body": "This page is available to signed-in members. Sign in or create an account first.",

  // Sign in, one time code step
  "auth.otp.title": "Enter the code we sent you",
  "auth.otp.subtitle": "We emailed a six digit code to {email}. It expires in 10 minutes.",
  "auth.otp.codeLabel": "Six digit code",
  "auth.otp.submit": "Verify and sign in",
  "auth.otp.resend": "Send a new code",
  "auth.otp.resendSuccess": "A new code is on its way.",
  "auth.otp.error.invalid": "That code is not right. {remaining} attempts left.",
  "auth.otp.error.expired": "That code has expired. Request a new one.",
  "auth.otp.error.tooManyAttempts": "Too many attempts. Sign in again to get a new code.",

  // Sign up, email verification
  "auth.verify.sentTitle": "Check your inbox",
  "auth.verify.sentBody":
    "We sent a verification link to {email}. Open it to activate your account, then sign in.",
  "auth.verify.resendCta": "Send the link again",
  "auth.verify.resendSuccess": "If that address has an account, a new link is on its way.",
  "auth.verify.successTitle": "Email verified",
  "auth.verify.successBody": "Your account is active. Sign in to continue.",
  "auth.verify.errorTitle": "That link did not work",
  "auth.verify.errorExpired": "This verification link has expired. Request a new one from the sign up page.",
  "auth.verify.errorInvalid": "This verification link is not valid, or has already been used.",

  // Forgot password
  "auth.forgot.title": "Reset your password",
  "auth.forgot.subtitle": "Enter your email and we will send a link to choose a new password.",
  "auth.forgot.submitCta": "Send reset link",
  "auth.forgot.genericSent":
    "If that address has an account, a reset link is on its way. It expires in one hour.",
  "auth.forgot.backToSignIn": "Back to sign in",

  // Reset password
  "auth.reset.title": "Choose a new password",
  "auth.reset.subtitle": "This link is valid for one hour and can only be used once.",
  "auth.reset.newPasswordLabel": "New password",
  "auth.reset.submitCta": "Update password",
  "auth.reset.successTitle": "Password updated",
  "auth.reset.successBody": "Sign in with your new password to continue.",
  "auth.reset.errorTitle": "That link did not work",
  "auth.reset.errorExpired": "This reset link has expired. Request a new one.",
  "auth.reset.errorInvalid": "This reset link is not valid, or has already been used.",

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

  // Verification, sign-in code and password reset email
  "email.verify.subject": "Confirm your email for SHADOW IDX",
  "email.verify.heading": "Confirm your email",
  "email.verify.body":
    "Thanks for creating an account. Click the button below to confirm this is your email address and activate your account.",
  "email.verify.cta": "Verify email",
  "email.verify.expiry": "This link expires in 24 hours. If you did not create an account, you can ignore this email.",
  "email.otp.subject": "Your sign-in code is {code}",
  "email.otp.heading": "Your sign-in code",
  "email.otp.body": "Enter this code to finish signing in to SHADOW IDX.",
  "email.otp.expiry": "This code expires in 10 minutes. If you did not try to sign in, you can ignore this email.",
  "email.resetPassword.subject": "Reset your SHADOW IDX password",
  "email.resetPassword.heading": "Reset your password",
  "email.resetPassword.body":
    "We received a request to reset your password. Click the button below to choose a new one.",
  "email.resetPassword.cta": "Reset password",
  "email.resetPassword.expiry": "This link expires in one hour. If you did not request this, you can ignore this email.",

  // Daily brief email
  "email.brief.subject": "Market brief {date}: {count} unusual moves",
  "email.brief.subjectNone": "Market brief {date}: no unusual moves",
  "email.brief.intro":
    "Across the {covered} stocks analysed today, {signals} moved beyond what their twins explain.",
  "email.brief.moversTitle": "Largest stock-specific moves",
  "email.brief.moverLine": "{symbol}: {specific} stock specific, z-score {z}. {label}.",
  "email.brief.disagreementsTitle": "News and price disagree",
  "email.brief.labelLine": "{symbol}: {label}.",
  "email.brief.smartMoneyTitle": "Smart money positioning",
  "email.brief.smartMoneyLine": "{symbol}: {label}, conviction {conviction} of 100.",
  "email.brief.calendarTitle": "Your watchlist, the next 14 days",
  "email.brief.calendarLine": "{date} {symbol}: {summary}",
  "email.brief.unreliable":
    "{count} stocks were left out of the rankings because their twins fit too poorly to rank.",
  "email.brief.cta": "Open the full brief",
  "email.brief.footnote":
    "You receive this because you turned on the daily brief. You can turn it off on your watchlist page.",

  // Market brief page
  "brief.title": "Market brief",
  "brief.description":
    "What moved beyond its twin, where news and price disagree, and what is coming up on your watchlist. Prepared automatically after each trading day.",
  "brief.asOf": "Run {date}",
  "brief.noRunTitle": "No brief yet",
  "brief.noRunBody":
    "The first brief is prepared automatically after the market closes on the next trading day.",
  "brief.inProgress": "Still being prepared: {done} of {total} stocks analysed so far.",
  "brief.stat.covered": "Stocks covered",
  "brief.stat.coveredCaption": "Watched stocks first, then a short default list. Not the whole market.",
  "brief.stat.signals": "Unusual moves",
  "brief.stat.signalsCaption": "Beyond {z} standard deviations, with a twin that fits.",
  "brief.stat.disagreements": "News vs price",
  "brief.stat.disagreementsCaption": "Where coverage and the move point different ways.",
  "brief.stat.credits": "Credits used",
  "brief.stat.creditsCaption": "Out of {cap} allowed for one day's run.",
  "brief.moversTitle": "Largest stock-specific moves",
  "brief.moversDescription":
    "Ranked by how unusual the move is for each stock, in either direction.",
  "brief.moversEmpty": "No stock had a twin reliable enough to rank today.",
  "brief.tableNews": "News vs price",
  "brief.disagreementsTitle": "News and price disagree",
  "brief.disagreementsDescription":
    "The move has no explanation in coverage yet, or coverage points the other way.",
  "brief.disagreementsEmpty": "None today. Where there was coverage, it agreed with the move.",
  "brief.smartMoneyTitle": "Smart money positioning",
  "brief.smartMoneyDescription":
    "Foreign and institutional flow disagreeing with price. Conviction scores the disagreement, not a forecast.",
  "brief.smartMoneyEmpty": "No strong disagreement between flow and price today.",
  "brief.conviction": "Conviction {value} of 100",
  "brief.sectorTitle": "Sector view",
  "brief.sectorDescription":
    "The average split of the move, for sectors with at least two covered stocks.",
  "brief.sectorEmpty": "Too few stocks per sector today to average.",
  "brief.sectorSingle": "Only one stock covered, so no sector average: {sectors}.",
  "brief.tableSector": "Sector",
  "brief.tableStocks": "Stocks",
  "brief.tableSignals": "Unusual",
  "brief.calendarTitle": "Your watchlist, the next {days} days",
  "brief.calendarDescription":
    "Upcoming dividends, splits and meetings, in rupiah where you recorded a position.",
  "brief.calendarEmpty": "Nothing scheduled in the coming days for the stocks you watch.",
  "brief.calendarNoWatchlist":
    "Add stocks to your watchlist to see their upcoming corporate actions here.",
  "brief.calendarNotCovered": "Not yet covered by a daily run: {symbols}.",
  "brief.trackTitle": "Track record",
  "brief.trackDescription":
    "Has the signal meant anything so far? Each day's result is stored with what the stock did against its twin over the next {sessions} sessions.",
  "brief.trackInsufficient":
    "Not enough history yet. {count} signals have a known outcome so far, and a rate is shown from {needed}. Until then any percentage would look precise and mean little.",
  "brief.trackOrdinaryCount": "{count} ordinary days have a known outcome.",
  "brief.trackSignals": "Signal days",
  "brief.trackOrdinary": "Ordinary days",
  "brief.trackContinued": "of the time, the gap kept going the same way afterwards.",
  "brief.trackExcess": "Average further move against the twin: {value}",
  "brief.trackCount": "{count} with a known outcome",
  "brief.trackBucketThin": "{count} so far, too few to show a rate.",
  "brief.trackCaveat1": "The track record describes this app's own past results. It is not a forecast.",
  "brief.trackCaveat2":
    "The twin is refitted every day, so the later comparison uses a slightly different peer mix.",
  "brief.trackCaveat3":
    "Only a few stocks are covered each day, so these results may not hold for other stocks.",
  "brief.notesTitle": "About today's coverage",
  "brief.unreliableLine": "{symbol}: twin fit {fit}, too weak to rank.",
  "brief.skippedLine": "Not analysed today to stay within the credit cap: {symbols}.",
  "brief.failedLine": "Could not be analysed today: {symbols}.",

  "watchlist.briefTitle": "Daily brief email",
  "watchlist.briefDescription":
    "Receive the market brief after each trading day. On Mondays it also lists the upcoming corporate actions on your watchlist.",
  "watchlist.briefOn": "Turn on",
  "watchlist.briefOff": "Turn off",
  "watchlist.briefStatusOn": "You receive the daily brief.",
  "watchlist.briefStatusOff": "You do not receive the daily brief.",

  // Brand
  "brand.tagline": "Market intelligence for IDX",
  "actions.showMore": "Show all",
  "actions.showLess": "Show less",

  // Analysis header and stat cards
  "analysis.back": "Back to search",
  "analysis.compareCta": "Compare with peers",
  "analysis.trackCta": "Track this stock",
  "stats.stockSpecificCaption": "The part of the move its peers do not explain.",
  "stats.twinFitCaption": "Built from {count} comparable companies.",
  "stats.twinFitWeak": "Weak fit, so read the divergence with care.",
  "stats.realityTitle": "News against price",

  // Narrative
  "narrative.title": "The story in plain words",
  "narrative.opening": "Over the last {sessions} sessions, {symbol} returned {total}.",
  "narrative.smartMoneyLead": "On positioning:",
  "narrative.closing":
    "All of this describes what has already happened. Use it to decide what deserves a closer look, and read the limits at the bottom of the page before acting on it.",

  // Attribution hero
  "hero.subtitle": "Split into the market, comparable companies and the company itself.",
  "hero.sessions": "Sessions",

  // Compare
  "compare.formTitle": "Pick the stocks",
  "compare.resultsTitle": "Ranked by divergence",
  "compare.summaryLead":
    "{symbol} is doing the most on its own: {specific} beyond what its twin explains, a divergence of {z} standard deviations.",
  "compare.summaryTail": " {symbol} sits closest to its twin, at {z}.",

  // Auth side panel
  "auth.panelTitle": "Why create an account",
  "auth.panelPoint1": "Keep a watchlist with your own alert threshold for every stock.",
  "auth.panelPoint2":
    "Get an alert only when a stock moves beyond what its peers explain, not on every price change.",
  "auth.panelPoint3": "Record your position so dividends and splits are shown in rupiah.",

  // Landing page
  "landing.titleLead": "Every stock has a",
  "landing.titleAccent": "shadow.",
  "landing.tickerCount": "{count} IDX tickers, searchable by code or name",
  "landing.dataSource": "Data from the Sectors API",
  "landing.noForecast": "Describes, never forecasts",
  "landing.illustration": "Illustration, not live data",
  "landing.illustrationStock": "Stock",
  "landing.howTitle": "How it works",
  "landing.howSubtitle": "Three steps, every time you search a ticker.",
  "landing.stepLabel": "Step {n}",
  "landing.step1Title": "Build the twin",
  "landing.step1Body":
    "We pick the listed companies that trade most like your stock and blend them into a synthetic twin.",
  "landing.step2Title": "Split the move",
  "landing.step2Body":
    "Every return is divided into what IHSG explains, what the twin explains, and what is left over.",
  "landing.step3Title": "Check the story",
  "landing.step3Body":
    "News tone and institutional flow are set against the price, so you can see whether they agree.",
  "landing.featuresTitle": "What each analysis shows you",
  "landing.featuresSubtitle":
    "Every panel answers one question, and says how sure it can be about the answer.",
  "landing.feature.twinTitle": "A twin you can audit",
  "landing.feature.twinBody":
    "See every peer in the twin, its weight and why it qualified. If the peer set looks wrong to you, you can dismiss the result.",
  "landing.feature.realityTitle": "News against price",
  "landing.feature.realityBody":
    "Headlines and the stock-specific move are compared side by side. When they disagree, that disagreement is the signal.",
  "landing.feature.smartTitle": "Smart money positioning",
  "landing.feature.smartBody":
    "Foreign flow and institutional ownership, set against the price to show who is buying what the market is selling.",
  "landing.feature.actionsTitle": "Corporate actions in rupiah",
  "landing.feature.actionsBody":
    "Dividends and splits shown as cash and shares for your own position, not as ratios.",
  "landing.feature.alertsTitle": "Alerts that stay quiet",
  "landing.feature.alertsBody":
    "You hear about a stock only when it moves beyond what its peers explain, with the reason in the message.",
  "landing.feature.compareTitle": "Compare by divergence",
  "landing.feature.compareBody":
    "Rank up to four stocks by how far each has moved from its own twin, rather than by raw return.",
  "landing.honestyTitle": "Built to avoid false confidence",
  "landing.honestyBody":
    "A 7% jump means little if every bank rose 6% the same day. The part that is left over, the move that belongs to the company alone, is the only part that says something new about it. That is the number SHADOW IDX exists to find, and it is careful about how sure it can be.",
  "landing.honestyPoint1": "No forecasts. Every figure describes what has already happened.",
  "landing.honestyPoint2": "Thin data produces no signal, rather than a weak one dressed up as strong.",
  "landing.honestyPoint3": "Every result carries its own limits, shown next to the numbers.",
  "landing.ctaTitle": "Start with a stock you already hold",
  "landing.ctaBody": "Create a free account, then search any IDX ticker to see its twin.",
  "landing.getStarted": "Get started",
  "landing.nav.features": "Features",
  "landing.nav.principles": "Principles",
  "landing.sampleCards": "Sample cards, not live data",
  "landing.marqueeLabel": "Some of the IDX stocks covered",
  "landing.card.chart": "Stock against its twin",
  "landing.card.question": "The market, the sector, or the company itself?",
  "landing.card.track": "Track a stock",
  "landing.card.trackBody": "Alerts only when it breaks from its twin",
  "landing.about.eyebrow": "What it does",
  "landing.about.line1": "A synthetic twin for every IDX stock,",
  "landing.about.line2a": "built to separate",
  "landing.about.line2b": "the market",
  "landing.about.line3a": "from",
  "landing.about.line3b": "the company’s own move.",
  "landing.stat.tickers": "IDX tickers covered, searchable by code or company name.",
  "landing.stat.tickersFallback": "Every listed IDX stock, searchable by code or company name.",
  "landing.stat.splitLabel": "Every return, split three ways",
  "landing.stat.splitUnit": "parts",
  "landing.stat.splitQuote": "A 7% jump means little if every bank rose 6% the same day.",
  "landing.stat.peersLabel": "Peers scored per twin, at most",
  "landing.stat.peersCaption":
    "Each one scored on sector, size, volatility, growth, dividends and how closely it trades.",
  "landing.stat.forecastsLabel": "Forecasts made",
  "landing.stat.forecastsCaption": "It describes what happened, never what will.",
  "landing.photoCredit": "Photos:",
  "analyse.fromWatchlist": "From your watchlist",
  "announcement.dismiss": "Dismiss",
  "account.menu": "Account menu",
  "account.profile": "Profile",
  "account.title": "Your account",
  "account.description": "Your profile, preferences and security, in one place.",
  "account.profileTitle": "Profile",
  "account.profileDescription": "How you appear in the app and in emails.",
  "account.verified": "Verified",
  "account.unverified": "Not verified",
  "account.name": "Name",
  "account.save": "Save",
  "account.saved": "Saved.",
  "account.memberSince": "Member since {date}.",
  "account.emailFixed": "Your email is your sign-in name and cannot be changed here.",
  "account.preferencesTitle": "Preferences",
  "account.preferencesDescription": "Language for the app and for the emails we send you.",
  "account.securityTitle": "Security",
  "account.securityDescription": "Changing your password signs out every other browser.",
  "account.currentPassword": "Current password",
  "account.changePassword": "Change password",
  "account.passwordChanged": "Password changed. Other browsers have been signed out.",
  "account.everywhereTitle": "Sign out everywhere",
  "account.everywhereBody": "Ends every session on every device, including this one.",
  "account.everywhereButton": "Sign out everywhere",
  "account.dangerTitle": "Delete account",
  "account.dangerDescription": "Deletes your account, watchlist, holdings and alerts. This cannot be undone.",
  "account.confirmWithPassword": "Confirm with your password",
  "account.deleteButton": "Delete my account",
  "account.deleteConfirm": "Delete your account and everything in it? This cannot be undone.",
  "account.error.nameTooLong": "Use at most 100 characters.",
  "account.error.generic": "That could not be saved. Try again.",
  "account.error.wrongPassword": "That password is not right.",
  "nav.market": "Market",
  "nav.stocks": "Stocks",
  "nav.portfolio": "Portfolio",
  "market.tab.summary": "Summary",
  "market.tab.sectors": "Sectors",
  "market.tab.track": "Track record",
  "stocks.tab.analyse": "Analyse",
  "stocks.tab.compare": "Compare",
  "stocks.tab.list": "Ticker list",
  "portfolio.tab.watchlist": "Watchlist",
  "portfolio.tab.alerts": "Alerts",
  "portfolio.tab.calendar": "Calendar",
  "market.title": "Market summary",
  "market.description": "What the latest daily run found across the stocks it covered: what moved on its own, where news and price disagree, and how institutions and foreign investors are positioned.",
  "market.sectors.title": "Sectors",
  "market.sectors.description": "Each sector's average return split into market, peers and stock specific, from the same run. Sectors with a single analysed stock are listed but not averaged.",
  "market.track.title": "Track record",
  "stocks.browseAll": "Browse every IDX ticker",
  "conclusion.label": "Conclusion",
  "conclusion.tone.signal": "Signal",
  "conclusion.tone.watch": "Worth watching",
  "conclusion.tone.calm": "Nothing unusual",
  "conclusion.tone.refused": "Not enough evidence",
  "conclusion.refused.peers": "No conclusion for {symbol}: its twin has only {count} peers, and at least {min} are needed before a move can be called its own.",
  "conclusion.refused.fit": "No conclusion for {symbol}: its twin explains only {fit} of its price moves, too little to call any part of this move its own.",
  "conclusion.signal.up": "{symbol} is rising on its own. {specific} of its move is not explained by the market or its peers, a gap of {z} standard deviations, which clears the bar for a signal.",
  "conclusion.signal.down": "{symbol} is falling on its own. {specific} of its move is not explained by the market or its peers, a gap of {z} standard deviations, which clears the bar for a signal.",
  "conclusion.watch": "{symbol} is drifting from its twin by {z} standard deviations, {specific} stock specific. Noticeable, but below the bar for a signal.",
  "conclusion.calm": "{symbol} is moving with its twin. The market and comparable companies explain most of its {total} move.",
  "conclusion.point.happened": "What happened: {total} over {sessions} sessions, of which market {market}, peers {sector} and stock specific {specific}.",
  "conclusion.point.unusual": "How unusual: a z score of {z}, with a twin built from {peers} peers that explains {fit} of the stock's price moves.",
  "conclusion.point.news.confirmed": "The news agrees with the move.",
  "conclusion.point.news.contradiction": "The news points the other way, so news and price disagree.",
  "conclusion.point.news.narrativeAhead": "The news has turned, but the price has not followed yet.",
  "conclusion.point.news.priceAhead": "The price moved before any news explains it.",
  "conclusion.point.news.insufficient": "There is too little news coverage to check the move against.",
  "conclusion.point.watch": "What to watch: {count} upcoming corporate action, the next a {action} on {date}.",
  "conclusion.point.watchNone": "What to watch: no corporate action is scheduled.",
  "conclusion.action.dividend": "dividend",
  "conclusion.action.split": "stock split",
  "conclusion.action.agm": "shareholder meeting",
  "conclusion.market.signals": "{count} of {covered} stocks moved beyond what their twins explain. The largest was {symbol}, {specific} stock specific at a z score of {z}.",
  "conclusion.market.quiet": "None of the {covered} stocks moved beyond what their twins explain, at a bar of {z} standard deviations. The market and peers account for today's moves.",
  "conclusion.market.empty": "The run on {date} stored no analysis, so there is nothing to conclude yet.",
  "conclusion.market.inProgress": "The run is still going: {done} of {total} stocks done. Figures will change.",
  "conclusion.market.partial": "Coverage is partial: {skipped} skipped by the credit cap and {failed} failed.",
  "conclusion.market.sector": "Sector to note: {sector}, {specific} stock specific on average across {count} stocks.",
  "conclusion.market.disagreements": "News and price disagree on {count}: {symbols}.",
  "conclusion.market.unreliable": "{count} left out of the rankings because their twin fits too poorly.",
  "conclusion.market.credits": "The run used {spent} of its {cap} credit cap.",
  "conclusion.market.footnote": "Read from the analyses stored on {date}. Describes what has happened; not investment advice.",
  "conclusion.sectors.top": "{sector} is where stocks moved most on their own: {specific} stock specific on average across {count} stocks.",
  "conclusion.sectors.none": "No sector has two or more reliably analysed stocks in this run, so no sector view is drawn.",
  "conclusion.sectors.single": "{count} sectors have only one analysed stock and are not averaged.",
  "conclusion.compare.signal": "{symbol} stands apart: {specific} stock specific, a z score of {z}, past the bar for a signal.",
  "conclusion.compare.calm": "{symbol} moved most on its own, {specific} stock specific at a z score of {z}, but none of these stocks clears the bar for a signal.",
  "conclusion.compare.bottom": "{symbol} is closest to its twin, at {z}.",
  "conclusion.compare.weak": "Left out of the call because their twin fits too poorly: {symbols}.",
  "conclusion.compare.none": "None of these stocks has a twin good enough to compare on.",
  "conclusion.portfolio.empty": "Your watchlist is empty. Add a stock to get a summary and alerts.",
  "conclusion.portfolio.signals": "{count} of your {watched} stocks are signalling in their latest analysis: {symbols}.",
  "conclusion.portfolio.quiet": "None of your {watched} stocks is signalling in its latest analysis.",
  "conclusion.portfolio.alerts": "{count} unread alerts.",
  "conclusion.portfolio.actions": "{count} corporate actions coming up on your stocks.",
  "conclusion.portfolio.income": "{count} corporate actions coming up, with {amount} in dividends on your holdings before tax.",
  "conclusion.portfolio.notCovered": "{count} of your stocks have no stored analysis yet; the daily run has not reached them.",
  "conclusion.track.notEnough": "Too early to judge: {count} resolved signals so far, and a rate is shown only from {min}.",
  "conclusion.track.result": "Across {count} resolved signals, the gap kept going the same way {share} of the time.",
  "conclusion.track.compare": "On ordinary days it kept going {ordinary} of the time, against {signal} for signals.",
  "conclusion.calendar.none": "No corporate action on your watchlist in the next {days} days.",
  "conclusion.calendar.some": "{count} corporate actions on your watchlist in the next {days} days.",
  "conclusion.calendar.income": "{count} corporate actions in the next {days} days, with {amount} in dividends on your holdings before tax.",
  "analysis.panelsHidden": "{count} panels hidden by your layout.",
  "analysis.panelsChange": "Change layout",
  "account.layoutTitle": "Layout and defaults",
  "account.layoutDescription": "Choose which panels an analysis shows and in what order, where you land after signing in, and the alert level new watchlist stocks start with.",
  "account.layoutPanels": "Analysis panels",
  "account.layoutPosition": "Position",
  "account.layoutHome": "Start page",
  "account.layoutThreshold": "Default alert level (z)",
  "account.layoutThresholdHint": "Used when you add a stock without setting its own level. 2 means roughly one session in twenty.",
  "account.error.layout": "Check the values: the alert level must be between 1 and 5.",
  "watchlist.settings": "Settings",
  "watchlist.saveSettings": "Save settings",
  "watchlist.alsoAlert": "Also alert me about",
  "watchlist.notifyCorporateAction": "Upcoming corporate actions",
  "watchlist.notifySmartMoney": "Institutional and foreign flow against the price",
  "watchlist.positionClearHint": "Leave lots empty to remove the position.",
  "watchlist.alertSummary": "Alert above z {z}",
  "watchlist.latestSignal": "Signal, z {z} on {date}",
  "watchlist.latestQuiet": "z {z} on {date}",
  "watchlist.latestNone": "Not analysed yet",
  "watchlist.action.saved": "{symbol} settings saved.",
  "list.title": "Ticker list",
  "list.description": "All {count} IDX tickers in the directory, with what the app already knows about each.",
  "list.search": "Search",
  "list.searchPlaceholder": "Code or company name",
  "list.sector": "Sector",
  "list.allSectors": "All sectors",
  "list.show": "Show",
  "list.show.all": "All tickers",
  "list.show.watched": "On my watchlist",
  "list.show.universe": "In the daily run",
  "list.show.analysed": "Analysed at least once",
  "list.sort": "Sort by",
  "list.sort.symbol": "Code",
  "list.sort.name": "Company name",
  "list.apply": "Apply",
  "list.sectorCoverage": "Sector known for {known} of {total} tickers. Sectors are learnt from analyses, so the sector filter covers only those.",
  "list.showing": "{count} tickers match.",
  "list.badge.watched": "Watching",
  "list.badge.universe": "Daily run",
  "list.badge.signal": "Signal, z {z}, {date}",
  "list.badge.analysed": "z {z}, {date}",
  "list.analyse": "Analyse",
  "list.compare": "Compare",
  "list.watch": "Watch",
  "list.emptyTitle": "The ticker directory is empty",
  "list.emptyBody": "It fills in after the weekly directory sync runs.",
  "list.noMatchTitle": "No ticker matches",
  "list.noMatchBody": "Try a shorter search or a different filter.",
  "list.pages": "Pages",
  "list.page": "Page {page} of {pages}",
  "list.prev": "Previous",
  "list.next": "Next",
  "landing.marqueeMoveCaption": "Returns over each stock's last analysis window, as of {date}. Not today's change.",
  "chat.title": "Ask SHADOW IDX",
  "chat.subtitle": "Answers from the app's stored analyses only.",
  "chat.open": "Open the assistant",
  "chat.close": "Close the assistant",
  "chat.empty": "Ask about the latest market run, a stock, or your watchlist.",
  "chat.suggest.market": "What stood out in the latest market run?",
  "chat.suggest.watchlist": "Is anything on my watchlist signalling?",
  "chat.suggest.stock": "Explain BBRI's latest analysis in plain words.",
  "chat.inputLabel": "Your question",
  "chat.placeholder": "Ask a question",
  "chat.send": "Send",
  "chat.thinking": "Thinking",
  "chat.clear": "Clear history",
  "chat.confirmClear": "Delete your whole chat history?",
  "chat.remaining": "{count} questions left today.",
  "chat.disclaimer": "Describes what has happened; not investment advice.",
  "chat.error.limit": "You have reached today's question limit. It resets at midnight, Jakarta time.",
  "chat.error.unavailable": "The assistant is switched off right now.",
  "chat.error.model": "The assistant could not answer just now. Try again in a moment.",
  "chat.error.generic": "Something went wrong. Try again.",
} as const;

/** Keys every visitor's browser has. */
export type PublicKey = keyof typeof en;
/** Every key, including the server-only ones. */
export type TranslationKey = PublicKey | AdminKey;

export const id: Record<PublicKey, string> = {
  "nav.analyse": "Analisis",
  "nav.compare": "Bandingkan",
  "nav.watchlist": "Watchlist",
  "nav.brief": "Brief",
  "nav.signIn": "Masuk",
  "nav.register": "Daftar",
  "nav.openMenu": "Buka menu",
  "nav.closeMenu": "Tutup menu",
  "nav.expand": "Tampilkan semua menu",
  "nav.collapse": "Kecilkan menu",
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
    "Saat sebuah saham bergerak, sebagian besar pergerakan itu biasanya milik pasar atau sektornya. SHADOW IDX membangun kembaran sintetis dari perusahaan sebanding dan menunjukkan bagian yang benar-benar milik saham itu sendiri.",
  "home.emptyTitle": "Masukkan kode saham untuk memulai",
  "home.emptyDescription":
    "Coba BBRI, BBCA, TLKM, atau kode saham IDX empat huruf apa pun. Analisis pertama pada suatu saham memerlukan waktu sesaat karena data pembandingnya sedang diambil.",
  "home.buildingTwin":
    "Membangun kembaran sintetis untuk {symbol}. Proses ini mengambil riwayat harga pembanding, jadi bisa memakan waktu beberapa detik.",

  "analysis.asOf": "Per {date}",
  "analysis.sessions": "{count} sesi",
  "analysis.noTwinTitle": "Kembaran yang andal tidak dapat dibangun untuk {symbol}",
  "analysis.noTwinFallback":
    "Data pembanding tidak cukup untuk membangun kembaran sintetis.",
  "analysis.attributionTitle": "Aktual dibandingkan kembarannya",
  "analysis.attributionDescription":
    "Return kumulatif saham dibandingkan dengan portofolio pembanding terdekatnya.",
  "analysis.breakdownTitle": "Asal pergerakan harga",
  "analysis.breakdownDescription":
    "Total return dipecah menjadi bagian yang dijelaskan oleh pasar, pembanding, dan perusahaan itu sendiri.",
  "analysis.twinTitle": "Komposisi kembaran",
  "analysis.twinDescription": "Setiap pembanding, bobotnya, dan alasan ia memenuhi syarat.",
  "analysis.keyStatsTitle": "Statistik kunci",
  "analysis.keyStatsDescription":
    "Angka valuasi, performa, dan pendapatan untuk perusahaan ini.",
  "analysis.actionsTitle": "Aksi korporasi",
  "analysis.actionsDescription":
    "Dividen, stock split, dan RUPS, beserta efeknya terhadap posisi Anda.",
  "analysis.seasonalityTitle": "Seasonality",
  "analysis.seasonalityDescription":
    "Bagaimana saham ini berperilaku per bulan kalender, lengkap dengan jumlah tahun di balik tiap angka.",
  "analysis.smartMoneyTitle": "Posisi smart money",
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
    "Laporan perusahaan untuk {symbol} tidak mencantumkan pembanding, sehingga kembaran tidak dapat dibangun.",
  "analysis.notice.peerSkipped":
    "Pembanding {symbol} dilewati karena datanya tidak dapat dimuat.",
  "analysis.notice.indexUnavailable":
    "Riwayat IHSG tidak tersedia, sehingga komponen pasar pada atribusi dilaporkan sebagai nol.",
  "analysis.notice.newsUnavailable":
    "Berita terbaru tidak dapat dimuat, sehingga reality check hanya menggunakan data harga.",
  "analysis.notice.actionsUnavailable":
    "Aksi korporasi tidak dapat dimuat untuk saham ini.",
  "analysis.notice.smartMoneyUnavailable":
    "Data aliran dana asing dan kepemilikan tidak tersedia, sehingga sinyal posisi tidak dapat dihasilkan.",

  "verdict.divergence.extreme": "Divergensi ekstrem",
  "verdict.divergence.significant": "Divergensi signifikan",
  "verdict.divergence.moderate": "Divergensi moderat",
  "verdict.divergence.normal": "Masih dalam rentang normal",
  "verdict.divergence.aligned": "Mengikuti kembarannya",
  "verdict.divergence.extreme.meaning":
    "Saham telah menyimpang dari kembarannya lebih dari tiga standar deviasi. Pergerakan sebesar ini jarang terjadi dan biasanya punya sebab spesifik.",
  "verdict.divergence.significant.meaning":
    "Saham bergerak jauh melampaui apa yang dijelaskan oleh pembandingnya. Layak dipahami sebelum bertindak berdasarkan harga ini.",
  "verdict.divergence.moderate.meaning":
    "Ada selisih antara saham dan kembarannya, tapi masih dalam rentang wajarnya.",
  "verdict.divergence.normal.meaning":
    "Saham berperilaku kurang lebih sesuai prediksi pembandingnya. Tidak ada yang perlu dijelaskan di sini.",
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
  "verdict.stat.stockSpecific": "Khusus saham",
  "verdict.stat.zScore": "Z-score divergensi",
  "verdict.stat.twinFit": "Kecocokan kembaran",
  "verdict.stat.weak": "lemah",
  "verdict.stat.peersUsed": "Pembanding digunakan",

  "attribution.totalReturn": "Total return sepanjang periode",
  "attribution.market": "Pasar",
  "attribution.marketDescription": "Dijelaskan oleh IHSG, diskalakan dengan beta saham ini",
  "attribution.sector": "Sektor dan pembanding",
  "attribution.sectorDescription": "Dijelaskan oleh kembaran sintetis, di luar pengaruh pasar",
  "attribution.specific": "Khusus saham",
  "attribution.specificDescription": "Tidak dijelaskan oleh keduanya. Inilah sinyalnya",
  "attribution.footnote": "Ketiga komponen ini berjumlah sama dengan total return, sesuai konstruksinya.",

  "chart.notEnoughHistory": "Riwayat yang tumpang tindih belum cukup untuk memplot kembaran.",
  "chart.actual": "{symbol} aktual",
  "chart.syntheticTwin": "Kembaran sintetis",
  "chart.divergenceCaption": "Area yang diarsir adalah divergensi antara keduanya",
  "chart.ariaLabel":
    "Return kumulatif {symbol} dibandingkan kembaran sintetisnya. Kembaran berakhir di {twinPct} persen dan {symbol} berakhir di {actualPct} persen, selisih {gapPct} poin persentase.",

  "twin.noneQualified":
    "Tidak ada pembanding yang melewati ambang batas kemiripan, sehingga kembaran tidak dapat dibangun.",
  "shadow.warning.insufficientHistory":
    "Riwayat harga yang tumpang tindih belum cukup ({available} dari {required} sesi yang dibutuhkan).",
  "shadow.warning.noPeerQualified":
    "Tidak ada pembanding yang melewati ambang batas kemiripan, sehingga kembaran yang andal tidak dapat dibangun.",
  "shadow.warning.fewPeers":
    "Kembaran hanya dibangun dari {count} pembanding; divergensinya kurang andal dibanding biasanya.",
  "shadow.warning.weakFit":
    "Kembaran hanya menjelaskan {percent}% variasi harga; anggap divergensi ini sebagai indikasi, bukan kesimpulan pasti.",
  "shadow.warning.fewSessions":
    "Riwayat kurang dari 20 sesi; z-score dilaporkan sebagai nol.",
  "twin.similarity": "kemiripan {value}",
  "twin.correlation": "korelasi {value}",
  "twin.weightFootnote":
    "Bobot proporsional terhadap kemiripan kuadrat, lalu diskalakan ulang agar volatilitas kembaran menyamai volatilitas target.",
  "twin.constituentAriaLabel":
    "{symbol} membawa {weightPct} persen bobot kembaran, dengan kemiripan {similarityPct} persen.",
  "twin.dimension.correlation": "Korelasi harga",
  "twin.dimension.sector": "Sub sektor",
  "twin.dimension.marketCap": "Kapitalisasi pasar",
  "twin.dimension.volatility": "Volatilitas",
  "twin.dimension.growth": "Pertumbuhan",
  "twin.dimension.dividend": "Dividen",

  "keystats.range52w": "Rentang 52 minggu",
  "keystats.rangeAriaLabel":
    "Harga berada di {percent} persen jarak antara level terendah 52 minggu {low} dan tertinggi {high}.",
  "keystats.groupMarket": "Pasar",
  "keystats.groupValuation": "Valuasi",
  "keystats.groupPerformance": "Performa",
  "keystats.groupIncome": "Pendapatan dan leverage",
  "keystats.lastClose": "Harga penutupan terakhir",
  "keystats.dailyChange": "Perubahan harian",
  "keystats.marketCap": "Kapitalisasi pasar",
  "keystats.volatility": "Volatilitas tahunan",
  "keystats.volatilityHint":
    "Sebaran return harian sepanjang periode, diskalakan ke basis tahunan.",
  "keystats.pe": "Price to earnings",
  "keystats.peHint": "Harga relatif terhadap laba tahunan per saham.",
  "keystats.pb": "Price to book",
  "keystats.peerPe": "Rata-rata PE pembanding",
  "keystats.peerPeHint": "Level valuasi perusahaan sebanding, sebagai pembanding.",
  "keystats.eps": "Earnings per share",
  "keystats.revenueGrowth": "Pertumbuhan pendapatan",
  "keystats.revenueGrowthHint":
    "Kuartal terakhir dibandingkan kuartal yang sama tahun sebelumnya.",
  "keystats.earningsGrowth": "Pertumbuhan laba",
  "keystats.roe": "Return on equity",
  "keystats.roeHint": "Laba yang dihasilkan per rupiah modal pemegang saham.",
  "keystats.netMargin": "Net margin",
  "keystats.dividendYield": "Imbal hasil dividen",
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
  "actions.dividendSummary": "Dividen {amount} per saham",
  "actions.dividendAnnounced": "Dividen diumumkan",
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
    "Riwayat aliran dana asing atau kepemilikan belum cukup untuk menilai posisi saham ini.",
  "smartmoney.caveat.insufficientData":
    "Riwayat aliran dana asing atau kepemilikan belum cukup untuk menilai posisi. Tidak ada sinyal, lebih baik daripada tebakan lemah.",
  "smartmoney.type.bullish": "Divergensi bullish",
  "smartmoney.type.bearish": "Divergensi bearish",
  "smartmoney.type.confirmedUp": "Dikonfirmasi aliran dana",
  "smartmoney.type.confirmedDown": "Dikonfirmasi aliran dana",
  "smartmoney.type.none": "Tidak ada divergensi",
  "smartmoney.meaning.bullish":
    "Harga turun sementara dana institusi dan asing justru terus terakumulasi. Ada pihak yang membeli apa yang dijual pasar.",
  "smartmoney.meaning.bearish":
    "Harga naik sementara dana institusi dan asing mengurangi eksposur. Rally ini sedang dijual.",
  "smartmoney.meaning.confirmedUp":
    "Harga dan posisi sama-sama naik, sehingga aliran dana sejalan dengan pergerakan, bukan bertentangan.",
  "smartmoney.meaning.confirmedDown":
    "Harga dan posisi sama-sama turun. Penurunan ini didukung arus keluar dana yang nyata, bukan sekadar perdagangan tipis.",
  "smartmoney.meaning.none":
    "Posisi institusi dan asing belum cukup berjauhan dari harga untuk disebut divergensi.",
  "smartmoney.conviction": "tingkat keyakinan {value}",
  "smartmoney.convictionFootnote":
    "Kekuatan ketidaksesuaian yang teramati, bukan probabilitas return di masa depan.",
  "smartmoney.priceOverWindow": "Harga sepanjang periode",
  "smartmoney.netForeignFlow": "Arus bersih dana asing",
  "smartmoney.flowIntensity": "Intensitas aliran dana",
  "smartmoney.flowIntensityHint": "porsi dari nilai transaksi",
  "smartmoney.institutionalShare": "Porsi institusi",
  "smartmoney.institutionalShareHint": "selama {months} bulan",
  "smartmoney.notAvailable": "tidak tersedia",
  "smartmoney.summaryLine":
    "Sepanjang periode harga bergerak {priceReturn} sementara arus bersih dana asing sebesar {flowValue}, {flowIntensity} dari nilai transaksi.",
  "smartmoney.ownershipLine":
    "Kepemilikan institusi berubah {shareChange} poin persentase sepanjang {months} snapshot bulanan, sementara ritel berubah {retailChange} poin.",
  "smartmoney.caveat.scope":
    "Posisi diukur dari aliran dana asing dan kategori kepemilikan institusi. Ini tidak mencakup transaksi direksi atau komisaris, karena sumber data ini tidak mempublikasikannya.",
  "smartmoney.caveat.notForecast":
    "Tingkat keyakinan menilai kekuatan ketidaksesuaian yang teramati, bukan probabilitas return di masa depan. Ambang batas ini adalah asumsi yang dinyatakan, bukan parameter hasil backtest.",
  "smartmoney.caveat.flowOnly":
    "Tidak ada snapshot kepemilikan yang dapat digunakan, sehingga sinyal ini hanya bersandar pada aliran dana asing.",
  "smartmoney.caveat.notPersistent":
    "Arah aliran dana tidak persisten, sehingga bisa jadi hanya satu transaksi besar.",

  "reality.attribution":
    "Dari total pergerakan, {marketPct}% berasal dari pasar, {sectorPct}% dari perusahaan sebanding, dan {idioPct}% khusus milik {symbol}.",
  "reality.confirmed":
    "Liputan berita cenderung {tone} dan pergerakan khusus saham searah dengannya (z = {z}). Kedua sinyal independen ini sejalan.",
  "reality.contradiction":
    "Liputan berita cenderung {tone}, tetapi pergerakan khusus saham justru berlawanan arah (z = {z}). Salah satu dari keduanya keliru, dan ketidaksesuaian ini sendiri adalah sinyalnya.",
  "reality.narrativeAhead":
    "Liputan berita cenderung {tone}, namun harga tidak melakukan apa pun yang belum dilakukan pembandingnya (z = {z}). Narasinya belum terlihat pada pergerakan harga.",
  "reality.priceAhead":
    "Saham ini bergerak dengan cara yang tidak dijelaskan pembandingnya (z = {z}) sementara liputannya {tone}. Harga bergerak lebih dulu sebelum berita muncul ke publik.",
  "reality.insufficient":
    "Baik liputan berita maupun pergerakan harga belum cukup kuat untuk mendukung kesimpulan. Tidak ada sinyal adalah jawaban paling jujur di sini.",
  "reality.tone.positive": "positif",
  "reality.tone.negative": "negatif",
  "reality.tone.mixed": "campuran",
  "reality.tone.quiet": "sepi",
  "reality.caveat.lexicon":
    "Tone diukur menggunakan kamus kata kunci, bukan model bahasa. Ini mendeteksi kata, bukan makna, dan bisa salah membaca sarkasme, negasi, serta kutipan pernyataan orang lain.",
  "reality.caveat.notAdvice":
    "Ini membandingkan apa yang sudah terjadi pada berita dan harga. Ini bukan prediksi, dan bukan saran investasi.",
  "reality.caveat.weakFit":
    "Kembaran sintetis ini hanya menjelaskan {percent}% variasi harga, sehingga angka khusus saham ini memiliki ketidakpastian yang nyata.",
  "reality.caveat.fewArticles":
    "Hanya {count} artikel{plural} dalam periode ini; tone mudah bergeser oleh satu media saja.",

  "compare.title": "Bandingkan saham",
  "compare.description":
    "Peringkat berdasarkan return menunjukkan sektor mana yang berkinerja baik. Peringkat berdasarkan divergensi menunjukkan perusahaan mana yang melakukan sesuatu yang tidak dilakukan pembandingnya.",
  "compare.emptyTitle": "Tambahkan hingga empat kode saham",
  "compare.emptyDescription": "Masukkan {min} sampai {max} kode saham IDX untuk membandingkan seberapa jauh masing-masing bergerak dari kembarannya sendiri.",
  "compare.buildingTwins":
    "Membangun kembaran untuk {count} {label}. Masing-masing mengambil riwayat pembandingnya sendiri, jadi ini memerlukan waktu sesaat.",
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
    "Saham diperingkatkan berdasarkan seberapa jauh masing-masing bergerak dari kembarannya sendiri, bukan berdasarkan return. Return besar yang juga dihasilkan pembandingnya tidak memberi informasi apa pun tentang perusahaan itu.",
  "compare.weakFitCaveat":
    "Pada {symbols}, kembaran hanya menjelaskan kurang dari 30% variasi harga, sehingga angka divergensinya bersifat indikatif, bukan konklusif.",
  "compare.tableStock": "Saham",
  "compare.tableTotal": "Total",
  "compare.tableMarket": "Pasar",
  "compare.tablePeers": "Pembanding",
  "compare.tableSpecific": "Khusus saham",
  "compare.tableZScore": "Z-score",
  "compare.tableFit": "Kecocokan",
  "compare.tableVerdict": "Verdict",
  "compare.tableCaption":
    "Saham diperingkatkan berdasarkan seberapa jauh masing-masing menyimpang dari kembaran sintetisnya.",
  "compare.noneUsable":
    "Tidak ada satu pun saham terpilih yang menghasilkan kembaran yang dapat digunakan.",
  "compare.noTwinReason": "Kembaran tidak dapat dibangun untuk saham ini.",
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
    "Posisi memungkinkan aksi korporasi ditampilkan dalam rupiah, bukan sekadar rasio. Satu lot sama dengan 100 lembar saham.",
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
    "Ini adalah kondisi yang diharapkan sebagian besar waktu. Notifikasi hanya muncul saat saham bergerak melampaui apa yang dijelaskan pembandingnya, yang memang dirancang jarang terjadi.",
  "watchlist.kind.divergence": "divergensi",
  "watchlist.kind.corporateAction": "aksi korporasi",
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
  "auth.signUpSubtitle": "Pantau saham dan terima notifikasi saat pergerakannya menyimpang dari kembarannya.",
  "auth.error.invalidEmail": "Masukkan alamat email yang valid.",
  "auth.error.passwordRequired": "Masukkan password Anda.",
  "auth.error.notRecognised": "Kombinasi email dan password itu tidak dikenali.",
  "auth.error.couldNotCreate": "Akun tidak dapat dibuat. Coba masuk dengan akun yang sudah ada.",
  "auth.error.passwordTooShort": "Gunakan minimal 10 karakter. Panjang lebih penting daripada simbol.",
  "auth.error.passwordTooLong": "Password tersebut terlalu panjang.",
  "auth.error.emailNotVerified":
    "Verifikasi email Anda sebelum masuk. Cek kotak masuk Anda untuk link verifikasi, atau minta link baru.",
  "auth.rememberMe": "Ingat saya selama 30 hari",
  "auth.forgotPassword": "Lupa password?",

  "auth.gate.title": "Masuk untuk melanjutkan",
  "auth.gate.body": "Halaman ini tersedia untuk member yang sudah masuk. Silakan masuk atau buat akun terlebih dahulu.",

  "auth.otp.title": "Masukkan kode yang kami kirimkan",
  "auth.otp.subtitle": "Kami mengirimkan kode enam digit ke {email}. Kode berlaku selama 10 menit.",
  "auth.otp.codeLabel": "Kode enam digit",
  "auth.otp.submit": "Verifikasi dan masuk",
  "auth.otp.resend": "Kirim kode baru",
  "auth.otp.resendSuccess": "Kode baru sedang dikirim.",
  "auth.otp.error.invalid": "Kode itu tidak sesuai. Sisa {remaining} percobaan.",
  "auth.otp.error.expired": "Kode itu sudah kedaluwarsa. Minta kode baru.",
  "auth.otp.error.tooManyAttempts": "Terlalu banyak percobaan. Masuk kembali untuk mendapatkan kode baru.",

  "auth.verify.sentTitle": "Cek kotak masuk Anda",
  "auth.verify.sentBody":
    "Kami mengirimkan link verifikasi ke {email}. Buka link tersebut untuk mengaktifkan akun Anda, lalu masuk.",
  "auth.verify.resendCta": "Kirim ulang link",
  "auth.verify.resendSuccess": "Jika alamat itu memiliki akun, link baru sedang dikirim.",
  "auth.verify.successTitle": "Email terverifikasi",
  "auth.verify.successBody": "Akun Anda sudah aktif. Masuk untuk melanjutkan.",
  "auth.verify.errorTitle": "Link itu tidak berhasil",
  "auth.verify.errorExpired": "Link verifikasi ini sudah kedaluwarsa. Minta link baru dari halaman daftar.",
  "auth.verify.errorInvalid": "Link verifikasi ini tidak valid, atau sudah pernah digunakan.",

  "auth.forgot.title": "Atur ulang password Anda",
  "auth.forgot.subtitle": "Masukkan email Anda dan kami akan mengirimkan link untuk memilih password baru.",
  "auth.forgot.submitCta": "Kirim link reset",
  "auth.forgot.genericSent":
    "Jika alamat itu memiliki akun, link reset sedang dikirim. Link berlaku selama satu jam.",
  "auth.forgot.backToSignIn": "Kembali ke halaman masuk",

  "auth.reset.title": "Pilih password baru",
  "auth.reset.subtitle": "Link ini berlaku selama satu jam dan hanya dapat digunakan sekali.",
  "auth.reset.newPasswordLabel": "Password baru",
  "auth.reset.submitCta": "Perbarui password",
  "auth.reset.successTitle": "Password diperbarui",
  "auth.reset.successBody": "Masuk dengan password baru Anda untuk melanjutkan.",
  "auth.reset.errorTitle": "Link itu tidak berhasil",
  "auth.reset.errorExpired": "Link reset ini sudah kedaluwarsa. Minta link baru.",
  "auth.reset.errorInvalid": "Link reset ini tidak valid, atau sudah pernah digunakan.",

  "alert.divergenceTitle": "{symbol} diperdagangkan {magnitude}% di {direction} kembarannya",
  "alert.direction.above": "atas",
  "alert.direction.below": "bawah",
  "alert.divergenceSummary":
    "{symbol} bergerak {magnitude}% di {direction} prediksi {peerCount} pembanding terdekatnya, divergensi sebesar {zScore} standar deviasi.",
  "alert.reality.priceAhead": "Belum ada berita yang menjelaskan ini. Harga bergerak lebih dulu sebelum berita muncul.",
  "alert.reality.contradiction":
    "Liputan berita justru menunjukkan arah sebaliknya, sehingga narasi dan pergerakan harga bertentangan.",
  "alert.reality.confirmed": "Liputan berita terbaru sejalan dengan pergerakan ini, kedua sinyal sepakat.",
  "alert.reality.narrativeAhead":
    "Liputan berita sudah aktif, tapi harga belum mencerminkannya sampai sekarang.",
  "alert.reality.insufficient": "Liputan berita masih terlalu sedikit untuk mendukung atau membantah pergerakan ini.",
  "alert.fitAndConfidence": "Kecocokan kembaran {fitPct}%, keyakinan {confidence}.",
  "alert.actionTitle": "{symbol}: {summary} pada {date}",
  "alert.actionDueCash": "Posisi Anda berhak menerima kira-kira {amount} sebelum pajak.",
  "alert.actionBecomesShares":
    "Kepemilikan Anda menjadi {shares} lembar saham dengan cost per saham disesuaikan menjadi {price}. Nilai total tidak berubah.",

  "email.greeting.named": "Halo {name},",
  "email.greeting.anonymous": "Halo,",
  "email.subjectSingle": "{title}",
  "email.subjectMultiple": "{count} saham di watchlist Anda bergerak menjauh dari kembarannya",
  "email.intro": "Saham-saham ini bergerak melampaui apa yang dijelaskan perusahaan sebanding.",
  "email.omittedNote": "{count} {label} lainnya tidak dimuat dalam digest ini.",
  "email.omitted.singular": "notifikasi",
  "email.omitted.plural": "notifikasi",
  "email.footer.disclaimer":
    "SHADOW IDX melaporkan apa yang sudah terjadi pada harga dan berita. Ini bukan prediksi return dan bukan saran investasi. Anda menerima email ini karena menambahkan saham-saham ini ke watchlist Anda.",

  "email.verify.subject": "Konfirmasi email Anda untuk SHADOW IDX",
  "email.verify.heading": "Konfirmasi email Anda",
  "email.verify.body":
    "Terima kasih sudah membuat akun. Klik tombol di bawah untuk mengonfirmasi bahwa ini adalah alamat email Anda dan mengaktifkan akun Anda.",
  "email.verify.cta": "Verifikasi email",
  "email.verify.expiry": "Link ini berlaku selama 24 jam. Jika Anda tidak membuat akun ini, abaikan email ini.",
  "email.otp.subject": "Kode masuk Anda adalah {code}",
  "email.otp.heading": "Kode masuk Anda",
  "email.otp.body": "Masukkan kode ini untuk menyelesaikan proses masuk ke SHADOW IDX.",
  "email.otp.expiry": "Kode ini berlaku selama 10 menit. Jika Anda tidak mencoba masuk, abaikan email ini.",
  "email.resetPassword.subject": "Atur ulang password SHADOW IDX Anda",
  "email.resetPassword.heading": "Atur ulang password Anda",
  "email.resetPassword.body":
    "Kami menerima permintaan untuk mengatur ulang password Anda. Klik tombol di bawah untuk memilih password baru.",
  "email.resetPassword.cta": "Atur ulang password",
  "email.resetPassword.expiry": "Link ini berlaku selama satu jam. Jika Anda tidak meminta ini, abaikan email ini.",

  "email.brief.subject": "Ringkasan pasar {date}: {count} pergerakan tidak biasa",
  "email.brief.subjectNone": "Ringkasan pasar {date}: tidak ada pergerakan tidak biasa",
  "email.brief.intro":
    "Dari {covered} saham yang dianalisis hari ini, {signals} bergerak melampaui apa yang dijelaskan kembarannya.",
  "email.brief.moversTitle": "Pergerakan khusus saham terbesar",
  "email.brief.moverLine": "{symbol}: {specific} khusus saham, z-score {z}. {label}.",
  "email.brief.disagreementsTitle": "Berita dan harga tidak sejalan",
  "email.brief.labelLine": "{symbol}: {label}.",
  "email.brief.smartMoneyTitle": "Posisi smart money",
  "email.brief.smartMoneyLine": "{symbol}: {label}, tingkat keyakinan {conviction} dari 100.",
  "email.brief.calendarTitle": "Watchlist Anda, 14 hari ke depan",
  "email.brief.calendarLine": "{date} {symbol}: {summary}",
  "email.brief.unreliable":
    "{count} saham tidak dimasukkan ke peringkat karena kembarannya terlalu lemah untuk diperingkat.",
  "email.brief.cta": "Buka brief lengkap",
  "email.brief.footnote":
    "Anda menerima email ini karena mengaktifkan daily brief. Anda dapat mematikannya di halaman watchlist.",

  "brief.title": "Ringkasan pasar",
  "brief.description":
    "Apa yang bergerak melampaui kembarannya, di mana berita dan harga tidak sejalan, dan apa yang akan datang di watchlist Anda. Disiapkan otomatis setelah setiap hari perdagangan.",
  "brief.asOf": "Dijalankan {date}",
  "brief.noRunTitle": "Belum ada brief",
  "brief.noRunBody":
    "Brief pertama disiapkan otomatis setelah pasar tutup pada hari perdagangan berikutnya.",
  "brief.inProgress": "Masih disiapkan: {done} dari {total} saham sudah dianalisis.",
  "brief.stat.covered": "Saham yang dicakup",
  "brief.stat.coveredCaption":
    "Saham di watchlist lebih dulu, lalu daftar default yang singkat. Bukan seluruh pasar.",
  "brief.stat.signals": "Pergerakan tidak biasa",
  "brief.stat.signalsCaption": "Melampaui {z} standar deviasi, dengan kembaran yang cocok.",
  "brief.stat.disagreements": "Berita vs harga",
  "brief.stat.disagreementsCaption": "Di mana liputan berita dan pergerakan harga menunjuk arah berbeda.",
  "brief.stat.credits": "Kredit terpakai",
  "brief.stat.creditsCaption": "Dari {cap} yang diizinkan untuk satu hari.",
  "brief.moversTitle": "Pergerakan khusus saham terbesar",
  "brief.moversDescription":
    "Diurutkan dari pergerakan yang paling tidak biasa untuk tiap saham, ke arah mana pun.",
  "brief.moversEmpty": "Tidak ada saham dengan kembaran yang cukup andal untuk diperingkat hari ini.",
  "brief.tableNews": "Berita vs harga",
  "brief.disagreementsTitle": "Berita dan harga tidak sejalan",
  "brief.disagreementsDescription":
    "Pergerakan belum dijelaskan oleh liputan berita, atau liputan berita justru menunjuk arah sebaliknya.",
  "brief.disagreementsEmpty":
    "Tidak ada hari ini. Di mana ada liputan berita, liputan berita sejalan dengan pergerakannya.",
  "brief.smartMoneyTitle": "Posisi smart money",
  "brief.smartMoneyDescription":
    "Aliran dana asing dan institusi yang bertentangan dengan harga. Tingkat keyakinan mengukur seberapa kuat pertentangannya, bukan prediksi.",
  "brief.smartMoneyEmpty": "Tidak ada pertentangan kuat antara aliran dana dan harga hari ini.",
  "brief.conviction": "Tingkat keyakinan {value} dari 100",
  "brief.sectorTitle": "Tampilan sektor",
  "brief.sectorDescription":
    "Rata-rata pembagian pergerakan, untuk sektor dengan minimal dua saham yang dicakup.",
  "brief.sectorEmpty": "Terlalu sedikit saham per sektor hari ini untuk dirata-rata.",
  "brief.sectorSingle": "Hanya satu saham yang dicakup, jadi tidak ada rata-rata sektor: {sectors}.",
  "brief.tableSector": "Sektor",
  "brief.tableStocks": "Saham",
  "brief.tableSignals": "Tidak biasa",
  "brief.calendarTitle": "Watchlist Anda, {days} hari ke depan",
  "brief.calendarDescription":
    "Dividen, stock split, dan RUPS yang akan datang, dalam rupiah jika Anda mencatat posisi.",
  "brief.calendarEmpty": "Tidak ada jadwal dalam beberapa hari ke depan untuk saham yang Anda pantau.",
  "brief.calendarNoWatchlist":
    "Tambahkan saham ke watchlist untuk melihat aksi korporasi yang akan datang di sini.",
  "brief.calendarNotCovered": "Belum dicakup oleh daily run: {symbols}.",
  "brief.trackTitle": "Track record",
  "brief.trackDescription":
    "Apakah sinyalnya pernah berarti sesuatu? Hasil setiap hari disimpan bersama apa yang dilakukan saham terhadap kembarannya selama {sessions} sesi berikutnya.",
  "brief.trackInsufficient":
    "Riwayatnya belum cukup. Baru {count} sinyal yang hasilnya sudah diketahui, dan persentase ditampilkan mulai dari {needed}. Sebelum itu, angka persentase akan terlihat presisi tapi hampir tidak berarti.",
  "brief.trackOrdinaryCount": "{count} hari biasa sudah diketahui hasilnya.",
  "brief.trackSignals": "Hari dengan sinyal",
  "brief.trackOrdinary": "Hari biasa",
  "brief.trackContinued": "dari seluruh kasus, selisihnya terus berlanjut ke arah yang sama setelahnya.",
  "brief.trackExcess": "Rata-rata pergerakan lanjutan terhadap kembaran: {value}",
  "brief.trackCount": "{count} dengan hasil yang diketahui",
  "brief.trackBucketThin": "Baru {count}, terlalu sedikit untuk menampilkan persentase.",
  "brief.trackCaveat1":
    "Track record menggambarkan hasil aplikasi ini sendiri di masa lalu. Ini bukan prediksi.",
  "brief.trackCaveat2":
    "Kembaran disusun ulang setiap hari, jadi perbandingan berikutnya memakai komposisi pembanding yang sedikit berbeda.",
  "brief.trackCaveat3":
    "Hanya sedikit saham yang dicakup setiap hari, jadi hasil ini belum tentu berlaku untuk saham lain.",
  "brief.notesTitle": "Tentang cakupan hari ini",
  "brief.unreliableLine": "{symbol}: kecocokan kembaran {fit}, terlalu lemah untuk diperingkat.",
  "brief.skippedLine": "Tidak dianalisis hari ini agar tetap dalam batas credit: {symbols}.",
  "brief.failedLine": "Tidak dapat dianalisis hari ini: {symbols}.",

  "watchlist.briefTitle": "Email daily brief",
  "watchlist.briefDescription":
    "Terima ringkasan pasar setelah setiap hari perdagangan. Setiap Senin juga berisi aksi korporasi yang akan datang di watchlist Anda.",
  "watchlist.briefOn": "Aktifkan",
  "watchlist.briefOff": "Matikan",
  "watchlist.briefStatusOn": "Anda menerima daily brief.",
  "watchlist.briefStatusOff": "Anda tidak menerima daily brief.",

  "brand.tagline": "Intelijen pasar untuk IDX",
  "actions.showMore": "Tampilkan semua",
  "actions.showLess": "Tampilkan lebih sedikit",

  "analysis.back": "Kembali ke pencarian",
  "analysis.compareCta": "Bandingkan dengan pembanding",
  "analysis.trackCta": "Pantau saham ini",
  "stats.stockSpecificCaption": "Bagian pergerakan yang tidak dijelaskan pembandingnya.",
  "stats.twinFitCaption": "Dibangun dari {count} perusahaan sebanding.",
  "stats.twinFitWeak": "Kecocokan lemah, jadi baca divergensinya dengan hati-hati.",
  "stats.realityTitle": "Berita vs harga",

  "narrative.title": "Ceritanya dalam bahasa sederhana",
  "narrative.opening": "Dalam {sessions} sesi terakhir, return {symbol} sebesar {total}.",
  "narrative.smartMoneyLead": "Dari sisi posisi:",
  "narrative.closing":
    "Semua ini menggambarkan apa yang sudah terjadi. Gunakan untuk memutuskan apa yang layak diperiksa lebih dalam, dan baca batasannya di bagian bawah halaman sebelum bertindak.",

  "hero.subtitle": "Dipecah menjadi pasar, perusahaan sebanding, dan perusahaan itu sendiri.",
  "hero.sessions": "Sesi",

  "compare.formTitle": "Pilih sahamnya",
  "compare.resultsTitle": "Diperingkat berdasarkan divergensi",
  "compare.summaryLead":
    "{symbol} paling banyak bergerak sendiri: {specific} di luar yang dijelaskan kembarannya, divergensi sebesar {z} standar deviasi.",
  "compare.summaryTail": " {symbol} paling dekat dengan kembarannya, di {z}.",

  "auth.panelTitle": "Mengapa membuat akun",
  "auth.panelPoint1": "Simpan watchlist dengan ambang notifikasi Anda sendiri untuk setiap saham.",
  "auth.panelPoint2":
    "Terima notifikasi hanya saat saham bergerak melampaui yang dijelaskan pembandingnya, bukan setiap kali harga berubah.",
  "auth.panelPoint3": "Catat posisi Anda agar dividen dan stock split ditampilkan dalam rupiah.",

  "landing.titleLead": "Setiap saham punya",
  "landing.titleAccent": "bayangan.",
  "landing.tickerCount": "{count} kode saham IDX, bisa dicari lewat kode atau nama",
  "landing.dataSource": "Data dari Sectors API",
  "landing.noForecast": "Menggambarkan, bukan meramal",
  "landing.illustration": "Ilustrasi, bukan data langsung",
  "landing.illustrationStock": "Saham",
  "landing.howTitle": "Cara kerjanya",
  "landing.howSubtitle": "Tiga langkah, setiap kali Anda mencari kode saham.",
  "landing.stepLabel": "Langkah {n}",
  "landing.step1Title": "Bangun kembaran",
  "landing.step1Body":
    "Kami memilih emiten yang pergerakannya paling mirip dengan saham Anda, lalu menggabungkannya menjadi kembaran sintetis.",
  "landing.step2Title": "Pisahkan pergerakannya",
  "landing.step2Body":
    "Setiap return dipecah menjadi bagian yang dijelaskan IHSG, bagian yang dijelaskan kembaran, dan sisanya.",
  "landing.step3Title": "Cek narasinya",
  "landing.step3Body":
    "Tone berita dan aliran dana institusi dibandingkan dengan harga, sehingga terlihat apakah keduanya sejalan.",
  "landing.featuresTitle": "Apa yang ditunjukkan setiap analisis",
  "landing.featuresSubtitle":
    "Setiap panel menjawab satu pertanyaan, dan menyebutkan seberapa yakin jawabannya.",
  "landing.feature.twinTitle": "Kembaran yang bisa Anda periksa",
  "landing.feature.twinBody":
    "Lihat setiap pembanding di dalam kembaran, bobotnya, dan alasan ia terpilih. Jika susunan pembanding terasa keliru bagi Anda, hasilnya bisa Anda abaikan.",
  "landing.feature.realityTitle": "Berita dibandingkan harga",
  "landing.feature.realityBody":
    "Judul berita dan pergerakan khusus saham dibandingkan berdampingan. Ketika keduanya tidak sejalan, ketidaksesuaian itulah sinyalnya.",
  "landing.feature.smartTitle": "Posisi smart money",
  "landing.feature.smartBody":
    "Aliran dana asing dan kepemilikan institusi, dibandingkan dengan harga untuk menunjukkan siapa yang membeli saat pasar menjual.",
  "landing.feature.actionsTitle": "Aksi korporasi dalam rupiah",
  "landing.feature.actionsBody":
    "Dividen dan stock split ditampilkan sebagai uang tunai dan jumlah saham untuk posisi Anda sendiri, bukan sekadar rasio.",
  "landing.feature.alertsTitle": "Notifikasi yang tidak berisik",
  "landing.feature.alertsBody":
    "Anda hanya diberi tahu saat saham bergerak melampaui yang dijelaskan pembandingnya, lengkap dengan alasannya.",
  "landing.feature.compareTitle": "Bandingkan lewat divergensi",
  "landing.feature.compareBody":
    "Urutkan hingga empat saham berdasarkan seberapa jauh masing-masing bergerak dari kembarannya, bukan dari return mentah.",
  "landing.honestyTitle": "Dirancang untuk menghindari keyakinan palsu",
  "landing.honestyBody":
    "Kenaikan 7% tidak berarti banyak jika semua bank naik 6% di hari yang sama. Sisa pergerakan yang benar-benar milik perusahaan itu sendiri adalah satu-satunya bagian yang memberi informasi baru tentangnya. Itulah angka yang dicari SHADOW IDX, dan ia berhati-hati soal seberapa yakin angka itu.",
  "landing.honestyPoint1": "Tanpa prediksi. Setiap angka menggambarkan apa yang sudah terjadi.",
  "landing.honestyPoint2": "Data yang tipis menghasilkan tidak ada sinyal, bukan sinyal lemah yang dikemas seolah kuat.",
  "landing.honestyPoint3": "Setiap hasil membawa batasannya sendiri, ditampilkan di samping angkanya.",
  "landing.ctaTitle": "Mulai dari saham yang sudah Anda miliki",
  "landing.ctaBody": "Buat akun gratis, lalu cari kode saham IDX mana pun untuk melihat kembarannya.",
  "landing.getStarted": "Mulai sekarang",
  "landing.nav.features": "Fitur",
  "landing.nav.principles": "Prinsip",
  "landing.sampleCards": "Contoh tampilan, bukan data langsung",
  "landing.marqueeLabel": "Sebagian saham IDX yang dicakup",
  "landing.card.chart": "Saham terhadap kembarannya",
  "landing.card.question": "Pasar, sektor, atau perusahaan itu sendiri?",
  "landing.card.track": "Pantau saham",
  "landing.card.trackBody": "Notifikasi hanya saat ia menyimpang dari kembarannya",
  "landing.about.eyebrow": "Apa yang dilakukan",
  "landing.about.line1": "Kembaran sintetis untuk setiap saham IDX,",
  "landing.about.line2a": "dibangun untuk memisahkan",
  "landing.about.line2b": "pasar",
  "landing.about.line3a": "dari",
  "landing.about.line3b": "pergerakan milik perusahaan itu sendiri.",
  "landing.stat.tickers": "Kode saham IDX tercakup, bisa dicari lewat kode atau nama perusahaan.",
  "landing.stat.tickersFallback": "Setiap saham IDX yang tercatat, bisa dicari lewat kode atau nama perusahaan.",
  "landing.stat.splitLabel": "Setiap return, dibagi tiga",
  "landing.stat.splitUnit": "bagian",
  "landing.stat.splitQuote": "Kenaikan 7% hampir tidak berarti jika semua bank naik 6% di hari yang sama.",
  "landing.stat.peersLabel": "Pembanding yang dinilai per kembaran, paling banyak",
  "landing.stat.peersCaption":
    "Masing-masing dinilai dari sektor, ukuran, volatilitas, pertumbuhan, dividen, dan seberapa mirip pergerakannya.",
  "landing.stat.forecastsLabel": "Prediksi yang dibuat",
  "landing.stat.forecastsCaption": "Menggambarkan yang sudah terjadi, bukan yang akan terjadi.",
  "landing.photoCredit": "Foto:",
  "analyse.fromWatchlist": "Dari watchlist Anda",
  "announcement.dismiss": "Tutup",
  "account.menu": "Menu akun",
  "account.profile": "Profil",
  "account.title": "Akun Anda",
  "account.description": "Profil, preferensi, dan keamanan akun Anda, di satu tempat.",
  "account.profileTitle": "Profil",
  "account.profileDescription": "Cara Anda tampil di aplikasi dan di email.",
  "account.verified": "Terverifikasi",
  "account.unverified": "Belum terverifikasi",
  "account.name": "Nama",
  "account.save": "Simpan",
  "account.saved": "Tersimpan.",
  "account.memberSince": "Bergabung sejak {date}.",
  "account.emailFixed": "Email Anda adalah nama masuk Anda dan tidak dapat diubah di sini.",
  "account.preferencesTitle": "Preferensi",
  "account.preferencesDescription": "Bahasa untuk aplikasi dan untuk email yang kami kirimkan.",
  "account.securityTitle": "Keamanan",
  "account.securityDescription": "Mengganti password akan mengeluarkan akun Anda dari semua browser lain.",
  "account.currentPassword": "Password saat ini",
  "account.changePassword": "Ganti password",
  "account.passwordChanged": "Password diganti. Browser lain sudah dikeluarkan.",
  "account.everywhereTitle": "Keluar dari semua perangkat",
  "account.everywhereBody": "Mengakhiri semua sesi di semua perangkat, termasuk yang ini.",
  "account.everywhereButton": "Keluar dari semua perangkat",
  "account.dangerTitle": "Hapus akun",
  "account.dangerDescription": "Menghapus akun, watchlist, posisi, dan notifikasi Anda. Tindakan ini tidak dapat dibatalkan.",
  "account.confirmWithPassword": "Konfirmasi dengan password Anda",
  "account.deleteButton": "Hapus akun saya",
  "account.deleteConfirm": "Hapus akun Anda beserta seluruh isinya? Tindakan ini tidak dapat dibatalkan.",
  "account.error.nameTooLong": "Gunakan paling banyak 100 karakter.",
  "account.error.generic": "Tidak dapat disimpan. Coba lagi.",
  "account.error.wrongPassword": "Password itu tidak sesuai.",
  "nav.market": "Pasar",
  "nav.stocks": "Saham",
  "nav.portfolio": "Portofolio",
  "market.tab.summary": "Ringkasan",
  "market.tab.sectors": "Sektor",
  "market.tab.track": "Rekam jejak",
  "stocks.tab.analyse": "Analisis",
  "stocks.tab.compare": "Bandingkan",
  "stocks.tab.list": "Daftar saham",
  "portfolio.tab.watchlist": "Watchlist",
  "portfolio.tab.alerts": "Notifikasi",
  "portfolio.tab.calendar": "Kalender",
  "market.title": "Ringkasan pasar",
  "market.description": "Temuan run harian terakhir pada saham yang dicakupnya: apa yang bergerak sendiri, di mana berita dan harga tidak sejalan, dan bagaimana posisi institusi dan investor asing.",
  "market.sectors.title": "Sektor",
  "market.sectors.description": "Rata-rata return tiap sektor dipecah menjadi pasar, pembanding, dan khusus saham, dari run yang sama. Sektor yang hanya punya satu saham teranalisis disebutkan tetapi tidak dirata-rata.",
  "market.track.title": "Rekam jejak",
  "stocks.browseAll": "Lihat semua kode saham IDX",
  "conclusion.label": "Kesimpulan",
  "conclusion.tone.signal": "Sinyal",
  "conclusion.tone.watch": "Layak dipantau",
  "conclusion.tone.calm": "Tidak ada yang tidak biasa",
  "conclusion.tone.refused": "Bukti belum cukup",
  "conclusion.refused.peers": "Belum ada kesimpulan untuk {symbol}: kembarannya hanya punya {count} pembanding, padahal minimal {min} diperlukan sebelum sebuah pergerakan bisa disebut miliknya sendiri.",
  "conclusion.refused.fit": "Belum ada kesimpulan untuk {symbol}: kembarannya hanya menjelaskan {fit} pergerakan harganya, terlalu sedikit untuk menyebut bagian mana pun dari pergerakan ini miliknya sendiri.",
  "conclusion.signal.up": "{symbol} naik karena faktornya sendiri. {specific} dari pergerakannya tidak dijelaskan oleh pasar maupun pembandingnya, selisih {z} standar deviasi, yang melewati ambang sinyal.",
  "conclusion.signal.down": "{symbol} turun karena faktornya sendiri. {specific} dari pergerakannya tidak dijelaskan oleh pasar maupun pembandingnya, selisih {z} standar deviasi, yang melewati ambang sinyal.",
  "conclusion.watch": "{symbol} mulai menjauh dari kembarannya sebesar {z} standar deviasi, {specific} khusus saham. Cukup terlihat, tetapi masih di bawah ambang sinyal.",
  "conclusion.calm": "{symbol} bergerak bersama kembarannya. Pasar dan perusahaan sebanding menjelaskan sebagian besar pergerakan {total}.",
  "conclusion.point.happened": "Yang terjadi: {total} selama {sessions} sesi, terdiri dari pasar {market}, pembanding {sector}, dan khusus saham {specific}.",
  "conclusion.point.unusual": "Seberapa tidak biasa: skor z {z}, dengan kembaran dari {peers} pembanding yang menjelaskan {fit} pergerakan harga saham ini.",
  "conclusion.point.news.confirmed": "Berita sejalan dengan pergerakan ini.",
  "conclusion.point.news.contradiction": "Berita menunjuk arah sebaliknya, jadi berita dan harga tidak sejalan.",
  "conclusion.point.news.narrativeAhead": "Berita sudah berubah, tetapi harga belum mengikuti.",
  "conclusion.point.news.priceAhead": "Harga bergerak lebih dulu sebelum ada berita yang menjelaskannya.",
  "conclusion.point.news.insufficient": "Liputan berita terlalu sedikit untuk memeriksa pergerakan ini.",
  "conclusion.point.watch": "Yang perlu dipantau: {count} aksi korporasi mendatang, yang terdekat {action} pada {date}.",
  "conclusion.point.watchNone": "Yang perlu dipantau: belum ada aksi korporasi terjadwal.",
  "conclusion.action.dividend": "dividen",
  "conclusion.action.split": "pemecahan saham",
  "conclusion.action.agm": "RUPS",
  "conclusion.market.signals": "{count} dari {covered} saham bergerak melampaui yang dijelaskan kembarannya. Yang terbesar {symbol}, {specific} khusus saham dengan skor z {z}.",
  "conclusion.market.quiet": "Tidak satu pun dari {covered} saham bergerak melampaui yang dijelaskan kembarannya, pada ambang {z} standar deviasi. Pasar dan pembanding menjelaskan pergerakan hari ini.",
  "conclusion.market.empty": "Run pada {date} belum menyimpan analisis, jadi belum ada yang bisa disimpulkan.",
  "conclusion.market.inProgress": "Run masih berjalan: {done} dari {total} saham selesai. Angka masih bisa berubah.",
  "conclusion.market.partial": "Cakupan belum lengkap: {skipped} dilewati karena batas kredit dan {failed} gagal.",
  "conclusion.market.sector": "Sektor yang patut dicatat: {sector}, rata-rata {specific} khusus saham pada {count} saham.",
  "conclusion.market.disagreements": "Berita dan harga tidak sejalan pada {count} saham: {symbols}.",
  "conclusion.market.unreliable": "{count} saham tidak diperingkat karena kembarannya kurang cocok.",
  "conclusion.market.credits": "Run ini memakai {spent} dari batas {cap} kredit.",
  "conclusion.market.footnote": "Dibaca dari analisis yang tersimpan pada {date}. Menggambarkan yang sudah terjadi, bukan saran investasi.",
  "conclusion.sectors.top": "{sector} adalah sektor yang sahamnya paling banyak bergerak sendiri: rata-rata {specific} khusus saham pada {count} saham.",
  "conclusion.sectors.none": "Belum ada sektor dengan dua saham atau lebih yang teranalisis andal pada run ini, jadi pandangan sektor tidak dibuat.",
  "conclusion.sectors.single": "{count} sektor hanya punya satu saham teranalisis dan tidak dirata-rata.",
  "conclusion.compare.signal": "{symbol} paling menonjol: {specific} khusus saham, skor z {z}, melewati ambang sinyal.",
  "conclusion.compare.calm": "{symbol} paling banyak bergerak sendiri, {specific} khusus saham dengan skor z {z}, tetapi tidak ada saham di sini yang melewati ambang sinyal.",
  "conclusion.compare.bottom": "{symbol} paling dekat dengan kembarannya, di {z}.",
  "conclusion.compare.weak": "Tidak disertakan dalam kesimpulan karena kembarannya kurang cocok: {symbols}.",
  "conclusion.compare.none": "Tidak satu pun saham ini punya kembaran yang cukup baik untuk dibandingkan.",
  "conclusion.portfolio.empty": "Watchlist Anda masih kosong. Tambahkan saham untuk mendapat ringkasan dan notifikasi.",
  "conclusion.portfolio.signals": "{count} dari {watched} saham Anda menunjukkan sinyal pada analisis terakhirnya: {symbols}.",
  "conclusion.portfolio.quiet": "Tidak satu pun dari {watched} saham Anda menunjukkan sinyal pada analisis terakhirnya.",
  "conclusion.portfolio.alerts": "{count} notifikasi belum dibaca.",
  "conclusion.portfolio.actions": "{count} aksi korporasi mendatang pada saham Anda.",
  "conclusion.portfolio.income": "{count} aksi korporasi mendatang, dengan dividen {amount} untuk posisi Anda sebelum pajak.",
  "conclusion.portfolio.notCovered": "{count} saham Anda belum punya analisis tersimpan; run harian belum menjangkaunya.",
  "conclusion.track.notEnough": "Terlalu dini untuk menilai: baru {count} sinyal yang selesai dinilai, dan persentase baru ditampilkan mulai {min}.",
  "conclusion.track.result": "Dari {count} sinyal yang selesai dinilai, selisihnya berlanjut ke arah yang sama {share} dari waktu.",
  "conclusion.track.compare": "Pada hari biasa selisihnya berlanjut {ordinary} dari waktu, dibandingkan {signal} untuk sinyal.",
  "conclusion.calendar.none": "Tidak ada aksi korporasi di watchlist Anda dalam {days} hari ke depan.",
  "conclusion.calendar.some": "{count} aksi korporasi di watchlist Anda dalam {days} hari ke depan.",
  "conclusion.calendar.income": "{count} aksi korporasi dalam {days} hari ke depan, dengan dividen {amount} untuk posisi Anda sebelum pajak.",
  "analysis.panelsHidden": "{count} panel disembunyikan oleh tata letak Anda.",
  "analysis.panelsChange": "Ubah tata letak",
  "account.layoutTitle": "Tata letak dan bawaan",
  "account.layoutDescription": "Pilih panel yang tampil di analisis beserta urutannya, halaman awal setelah masuk, dan tingkat notifikasi awal untuk saham baru di watchlist.",
  "account.layoutPanels": "Panel analisis",
  "account.layoutPosition": "Urutan",
  "account.layoutHome": "Halaman awal",
  "account.layoutThreshold": "Tingkat notifikasi bawaan (z)",
  "account.layoutThresholdHint": "Dipakai saat Anda menambah saham tanpa mengatur tingkatnya sendiri. 2 berarti kira-kira satu dari dua puluh sesi.",
  "account.error.layout": "Periksa nilainya: tingkat notifikasi harus antara 1 dan 5.",
  "watchlist.settings": "Pengaturan",
  "watchlist.saveSettings": "Simpan pengaturan",
  "watchlist.alsoAlert": "Beri tahu saya juga tentang",
  "watchlist.notifyCorporateAction": "Aksi korporasi mendatang",
  "watchlist.notifySmartMoney": "Aliran dana institusi dan asing yang berlawanan dengan harga",
  "watchlist.positionClearHint": "Kosongkan lot untuk menghapus posisi.",
  "watchlist.alertSummary": "Notifikasi di atas z {z}",
  "watchlist.latestSignal": "Sinyal, z {z} pada {date}",
  "watchlist.latestQuiet": "z {z} pada {date}",
  "watchlist.latestNone": "Belum dianalisis",
  "watchlist.action.saved": "Pengaturan {symbol} tersimpan.",
  "list.title": "Daftar saham",
  "list.description": "Semua {count} kode saham IDX di direktori, beserta apa yang sudah diketahui aplikasi tentang masing-masing.",
  "list.search": "Cari",
  "list.searchPlaceholder": "Kode atau nama perusahaan",
  "list.sector": "Sektor",
  "list.allSectors": "Semua sektor",
  "list.show": "Tampilkan",
  "list.show.all": "Semua saham",
  "list.show.watched": "Di watchlist saya",
  "list.show.universe": "Dalam run harian",
  "list.show.analysed": "Pernah dianalisis",
  "list.sort": "Urutkan",
  "list.sort.symbol": "Kode",
  "list.sort.name": "Nama perusahaan",
  "list.apply": "Terapkan",
  "list.sectorCoverage": "Sektor diketahui untuk {known} dari {total} saham. Sektor dipelajari dari analisis, jadi filter sektor hanya mencakup saham tersebut.",
  "list.showing": "{count} saham cocok.",
  "list.badge.watched": "Dipantau",
  "list.badge.universe": "Run harian",
  "list.badge.signal": "Sinyal, z {z}, {date}",
  "list.badge.analysed": "z {z}, {date}",
  "list.analyse": "Analisis",
  "list.compare": "Bandingkan",
  "list.watch": "Pantau",
  "list.emptyTitle": "Direktori saham masih kosong",
  "list.emptyBody": "Direktori terisi setelah sinkronisasi mingguan berjalan.",
  "list.noMatchTitle": "Tidak ada saham yang cocok",
  "list.noMatchBody": "Coba kata kunci yang lebih pendek atau filter lain.",
  "list.pages": "Halaman",
  "list.page": "Halaman {page} dari {pages}",
  "list.prev": "Sebelumnya",
  "list.next": "Berikutnya",
  "landing.marqueeMoveCaption": "Return selama jendela analisis terakhir tiap saham, per {date}. Bukan perubahan hari ini.",
  "chat.title": "Tanya SHADOW IDX",
  "chat.subtitle": "Menjawab hanya dari analisis yang tersimpan di aplikasi.",
  "chat.open": "Buka asisten",
  "chat.close": "Tutup asisten",
  "chat.empty": "Tanyakan run pasar terakhir, sebuah saham, atau watchlist Anda.",
  "chat.suggest.market": "Apa yang menonjol pada run pasar terakhir?",
  "chat.suggest.watchlist": "Apakah ada saham di watchlist saya yang menunjukkan sinyal?",
  "chat.suggest.stock": "Jelaskan analisis terakhir BBRI dengan bahasa sederhana.",
  "chat.inputLabel": "Pertanyaan Anda",
  "chat.placeholder": "Tulis pertanyaan",
  "chat.send": "Kirim",
  "chat.thinking": "Sedang berpikir",
  "chat.clear": "Hapus riwayat",
  "chat.confirmClear": "Hapus seluruh riwayat percakapan Anda?",
  "chat.remaining": "Sisa {count} pertanyaan hari ini.",
  "chat.disclaimer": "Menggambarkan yang sudah terjadi, bukan saran investasi.",
  "chat.error.limit": "Batas pertanyaan hari ini sudah tercapai. Batas direset tengah malam waktu Jakarta.",
  "chat.error.unavailable": "Asisten sedang dinonaktifkan.",
  "chat.error.model": "Asisten belum bisa menjawab saat ini. Coba lagi sebentar lagi.",
  "chat.error.generic": "Terjadi kesalahan. Coba lagi.",
};
