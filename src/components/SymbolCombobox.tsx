"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/client";

/**
 * Ticker and company name autocomplete, shared by the analyse and compare
 * search inputs.
 *
 * Matches against the locally synced directory (src/app/api/companies/search),
 * never the Sectors API directly, so typing costs nothing in credits and
 * responds in milliseconds rather than waiting on a network round trip to a
 * third party for every keystroke.
 *
 * Implements the WAI-ARIA combobox pattern: role="combobox" on the input,
 * role="listbox" on the results, aria-activedescendant tracking the
 * highlighted option, so the dropdown is announced correctly by a screen
 * reader and fully operable by keyboard alone.
 */

export interface DirectoryMatch {
  symbol: string;
  companyName: string;
}

interface SearchResponse {
  results: DirectoryMatch[];
  totalMatches: number;
  truncated: boolean;
}

/** Delay before a keystroke triggers a lookup, short enough to feel instant. */
const DEBOUNCE_MS = 120;
const MIN_QUERY_LENGTH = 1;

export function SymbolCombobox({
  value,
  onChange,
  onSelect,
  placeholder,
  inputClassName,
  id,
  invalid,
  describedBy,
  onEnterWithoutSelection,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (match: DirectoryMatch) => void;
  placeholder: string;
  inputClassName: string;
  id: string;
  invalid?: boolean;
  describedBy?: string;
  /** Called when Enter is pressed with no dropdown option highlighted. */
  onEnterWithoutSelection?: () => void;
}) {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<DirectoryMatch[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const requestSeq = useRef(0);

  const query = value.trim();

  useEffect(() => {
    // A query too short to search is handled by the render below reading
    // `query` directly; the effect only needs to run the debounced fetch.
    if (query.length < MIN_QUERY_LENGTH) return;

    const seq = ++requestSeq.current;
    const timer = setTimeout(() => {
      // The loading flag flips inside the timer callback rather than the
      // effect body itself, so nothing calls setState synchronously during
      // the render/effect cycle; it only ever runs from this async callback.
      setLoading(true);
      fetch(`/api/companies/search?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? (r.json() as Promise<SearchResponse>) : null))
        .then((data) => {
          // Ignores a response that arrived after a newer request was fired,
          // which otherwise flashes stale results when typing quickly.
          if (!data || seq !== requestSeq.current) return;
          setMatches(data.results);
          setTotalMatches(data.totalMatches);
          setTruncated(data.truncated);
          // Only open for someone actually typing. The field can also be
          // pre-filled from the URL (the ticker being analysed), and a lookup
          // for that value must not pop a dropdown over the page on load.
          setOpen(
            data.results.length > 0 && document.activeElement === inputRef.current,
          );
          setHighlighted(-1);
        })
        .catch(() => {
          if (seq === requestSeq.current) setOpen(false);
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // A query that has become too short to search clears any stale results
  // synchronously during render, rather than through a state update queued
  // from an effect one tick later.
  const effectiveMatches = query.length < MIN_QUERY_LENGTH ? [] : matches;
  const effectiveOpen = query.length < MIN_QUERY_LENGTH ? false : open;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const choose = (match: DirectoryMatch) => {
    onSelect(match);
    setOpen(false);
    setMatches([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || matches.length === 0) {
      // With no dropdown open, Enter submits whatever was typed rather than
      // being swallowed, so a known ticker works without waiting on a match.
      if (e.key === "Enter" && onEnterWithoutSelection) {
        e.preventDefault();
        onEnterWithoutSelection();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0) choose(matches[highlighted]);
      else onEnterWithoutSelection?.();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const remaining = totalMatches - effectiveMatches.length;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={effectiveOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlighted >= 0 ? `${listboxId}-option-${highlighted}` : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (matches.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        maxLength={80}
        autoComplete="off"
        spellCheck={false}
        className={inputClassName}
      />

      {effectiveOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("search.resultsLabel")}
          className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-80 overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface py-1 shadow-[var(--shadow-card)]"
        >
          {effectiveMatches.map((match, i) => (
            <li
              key={match.symbol}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={highlighted === i}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(match)}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex w-full items-baseline gap-2.5 px-3.5 py-2 text-left transition-colors ${
                  highlighted === i ? "bg-surface-raised" : ""
                }`}
              >
                <span className="tnum shrink-0 text-sm font-medium text-text">
                  {match.symbol}
                </span>
                <span className="truncate text-sm text-text-muted">
                  {match.companyName}
                </span>
              </button>
            </li>
          ))}

          {truncated && remaining > 0 ? (
            <li className="border-t border-border px-3.5 py-2 text-xs text-text-subtle">
              {t("search.moreResults", { count: remaining })}
            </li>
          ) : null}
        </ul>
      ) : null}

      {loading && !effectiveOpen ? (
        <span className="sr-only" role="status">
          {t("search.loading")}
        </span>
      ) : null}
    </div>
  );
}
