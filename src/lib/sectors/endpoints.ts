/**
 * Single source of truth for Sectors REST API paths.
 *
 * The published docs index lists longer canonical paths (for example
 * `/v2/indonesia/report/company-report`) while the per-endpoint reference pages
 * document the shorter served form (`/v2/company/report/{symbol}/`). Keeping
 * every path in this one module means a change in the upstream contract is a
 * one-file edit rather than a codebase-wide search.
 */

export const SECTORS_BASE_URL = "https://api.sectors.app";

/** Credit cost per successful call, used by the budget ledger. */
export const CREDIT_COST = {
  companyReportSection: 1,
  corporateActions: 1,
  dailyTransaction: 1,
  news: 1,
  indexDaily: 1,
  screener: 1,
  foreignFlow: 1,
  shareholders: 1,
} as const;

export type CompanyReportSection =
  | "dividend"
  | "financials"
  | "future"
  | "management"
  | "overview"
  | "ownership"
  | "peers"
  | "valuation";

export const endpoints = {
  companyReport: (symbol: string) => `/v2/company/report/${symbol}/`,
  corporateActions: (symbol: string) => `/v2/company/corporate-actions/${symbol}/`,
  dailyTransaction: (symbol: string) => `/v2/daily/${symbol}/`,
  news: () => `/v2/news/`,
  indexDaily: (index: string) => `/v2/index-daily/${index}/`,
  screener: () => `/v2/companies/`,
  foreignFlow: (symbol: string) => `/v2/foreign-flow/${symbol}/`,
  shareholders: (symbol: string) =>
    `/v2/company/shareholders-composition/${symbol}/`,
} as const;

/**
 * Normalises user input to the form the API expects: four uppercase letters,
 * no `.JK` suffix. Returns null when the input cannot be a valid IDX ticker so
 * callers can reject it before spending a credit.
 */
export function normalizeSymbol(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\.JK$/, "");
  return /^[A-Z]{4}$/.test(cleaned) ? cleaned : null;
}
