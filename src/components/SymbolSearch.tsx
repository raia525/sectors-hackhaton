"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SymbolCombobox, type DirectoryMatch } from "./SymbolCombobox";
import { useTranslation } from "@/lib/i18n/client";

/**
 * Ticker and company name search.
 *
 * Validation happens here as well as on the server. The client check is purely
 * for feedback speed; the server repeats it because a malformed ticker that
 * reaches the API would waste a credit, and client validation can always be
 * bypassed.
 */

const SUGGESTIONS = ["BBRI", "BBCA", "TLKM", "ASII", "GOTO"];

export function SymbolSearch({ initialSymbol }: { initialSymbol?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [value, setValue] = useState(initialSymbol?.toUpperCase() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (raw: string) => {
    const symbol = raw.trim().toUpperCase().replace(/\.JK$/, "");

    if (!/^[A-Z]{4}$/.test(symbol)) {
      setError(t("search.invalidTicker"));
      return;
    }

    setError(null);
    startTransition(() => {
      router.push(`/?symbol=${symbol}`);
    });
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="flex flex-wrap gap-2"
      >
        <div className="min-w-[200px] flex-1">
          <label htmlFor="symbol" className="sr-only">
            {t("search.placeholder")}
          </label>
          <SymbolCombobox
            id="symbol"
            value={value}
            onChange={(next) => {
              setValue(next);
              if (error) setError(null);
            }}
            onSelect={(match: DirectoryMatch) => submit(match.symbol)}
            placeholder={t("search.placeholder")}
            inputClassName="w-full rounded-full border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
            invalid={error !== null}
            describedBy={error ? "symbol-error" : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {isPending ? t("search.analysing") : t("search.button")}
        </button>
      </form>

      {error ? (
        <p id="symbol-error" role="alert" className="mt-2 text-sm text-down">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-subtle">{t("search.tryLabel")}</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setValue(s);
              submit(s);
            }}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
