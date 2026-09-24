"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MAX_COMPARE, MIN_COMPARE } from "@/lib/analysis/constants";
import { SymbolCombobox, type DirectoryMatch } from "./SymbolCombobox";
import { useTranslation } from "@/lib/i18n/client";

/**
 * Ticker chip input for the comparison page.
 *
 * Chips rather than a comma-separated field: each ticker is independently
 * removable, and the cap is enforced visibly rather than by silently
 * truncating what the user typed.
 */

export function CompareForm({ initialSymbols }: { initialSymbols: string[] }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [symbols, setSymbols] = useState<string[]>(initialSymbols);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addSymbol = (raw: string) => {
    const symbol = raw.trim().toUpperCase().replace(/\.JK$/, "");

    if (!/^[A-Z]{4}$/.test(symbol)) {
      setError(t("search.invalidTicker"));
      return;
    }
    if (symbols.includes(symbol)) {
      setError(t("compare.errorDuplicate", { symbol }));
      return;
    }
    if (symbols.length >= MAX_COMPARE) {
      setError(t("compare.errorMax", { max: MAX_COMPARE }));
      return;
    }

    setSymbols([...symbols, symbol]);
    setValue("");
    setError(null);
  };

  const remove = (symbol: string) => {
    setSymbols(symbols.filter((s) => s !== symbol));
    setError(null);
  };

  const run = () => {
    if (symbols.length < MIN_COMPARE) {
      setError(t("compare.errorMin", { min: MIN_COMPARE }));
      return;
    }
    startTransition(() => {
      router.push(`/compare?symbols=${symbols.join(",")}`);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[180px] flex-1">
          <label htmlFor="compare-symbol" className="sr-only">
            {t("compare.addTicker")}
          </label>
          <SymbolCombobox
            id="compare-symbol"
            value={value}
            onChange={(next) => {
              setValue(next);
              if (error) setError(null);
            }}
            onSelect={(match: DirectoryMatch) => addSymbol(match.symbol)}
            placeholder={t("compare.addTicker")}
            inputClassName="w-full rounded-full border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
            invalid={error !== null}
            describedBy={error ? "compare-error" : undefined}
            // Enter with no dropdown open still adds whatever was typed, so a
            // known ticker can be entered without waiting on the network.
            onEnterWithoutSelection={() => addSymbol(value)}
          />
        </div>

        <button
          type="button"
          onClick={() => addSymbol(value)}
          className="rounded-full border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
        >
          {t("compare.add")}
        </button>

        <button
          type="button"
          onClick={run}
          disabled={isPending || symbols.length < MIN_COMPARE}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? t("compare.comparing") : t("compare.compareButton")}
        </button>
      </div>

      {error ? (
        <p id="compare-error" role="alert" className="mt-2 text-sm text-down">
          {error}
        </p>
      ) : null}

      {symbols.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {symbols.map((symbol) => (
            <li key={symbol}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-sm text-text">
                {symbol}
                <button
                  type="button"
                  onClick={() => remove(symbol)}
                  aria-label={t("compare.remove", { symbol })}
                  className="text-text-subtle transition-colors hover:text-down"
                >
                  &times;
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
