"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MAX_COMPARE, MIN_COMPARE } from "@/lib/analysis/constants";

/**
 * Ticker chip input for the comparison page.
 *
 * Chips rather than a comma-separated field: each ticker is independently
 * removable, and the cap is enforced visibly rather than by silently
 * truncating what the user typed.
 */

export function CompareForm({ initialSymbols }: { initialSymbols: string[] }) {
  const router = useRouter();
  const [symbols, setSymbols] = useState<string[]>(initialSymbols);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const add = () => {
    const symbol = value.trim().toUpperCase().replace(/\.JK$/, "");

    if (!/^[A-Z]{4}$/.test(symbol)) {
      setError("An IDX ticker is four letters, for example BBRI.");
      return;
    }
    if (symbols.includes(symbol)) {
      setError(`${symbol} is already in the comparison.`);
      return;
    }
    if (symbols.length >= MAX_COMPARE) {
      setError(`You can compare up to ${MAX_COMPARE} stocks at once.`);
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
      setError(`Add at least ${MIN_COMPARE} tickers to compare.`);
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
            Add a ticker
          </label>
          <input
            id="compare-symbol"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Add a ticker"
            maxLength={7}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "compare-error" : undefined}
            className="w-full rounded-full border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={add}
          className="rounded-full border border-border px-4 py-2.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
        >
          Add
        </button>

        <button
          type="button"
          onClick={run}
          disabled={isPending || symbols.length < MIN_COMPARE}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Comparing" : "Compare"}
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
                  aria-label={`Remove ${symbol}`}
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
