"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addToWatchlist,
  removeFromWatchlist,
  updateThreshold,
  type ActionState,
} from "@/app/watchlist/actions";

/**
 * Watchlist management.
 *
 * The threshold control is a slider rather than a number field because the
 * value is a judgement about noise tolerance, not a precise quantity, and the
 * inline description translates each setting into how often it will actually
 * fire. A user setting "2.0" has no way to know what that means otherwise.
 */

interface Item {
  symbol: string;
  zScoreThreshold: number;
  lastNotifiedAt: string | null;
  holding: { lots: number; avgPrice: number } | null;
}

const INITIAL: ActionState = {};

export function WatchlistManager({ items }: { items: Item[] }) {
  const [addState, addAction, addPending] = useActionState(addToWatchlist, INITIAL);
  const [showPosition, setShowPosition] = useState(false);

  return (
    <div className="space-y-6">
      <form action={addAction} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[140px] flex-1">
            <label htmlFor="watch-symbol" className="sr-only">
              Ticker
            </label>
            <input
              id="watch-symbol"
              name="symbol"
              required
              maxLength={7}
              placeholder="Add a ticker"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-[8px] border border-border bg-surface-raised px-3 py-2 text-sm uppercase text-text placeholder:normal-case placeholder:text-text-subtle focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={addPending}
            className="rounded-[8px] bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {addPending ? "Adding" : "Add"}
          </button>
        </div>

        <ThresholdField name="zScoreThreshold" defaultValue={2} />

        <div>
          <button
            type="button"
            onClick={() => setShowPosition(!showPosition)}
            aria-expanded={showPosition}
            className="text-xs text-text-subtle underline-offset-2 hover:text-text-muted hover:underline"
          >
            {showPosition ? "Hide position" : "Add your position, optional"}
          </button>

          {showPosition ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-text-subtle">
                  Lots
                </span>
                <input
                  name="lots"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="10"
                  className="mt-1 w-full rounded-[8px] border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-text-subtle">
                  Average price
                </span>
                <input
                  name="avgPrice"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="4500"
                  className="mt-1 w-full rounded-[8px] border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                />
              </label>
              <p className="col-span-2 text-xs text-text-subtle">
                A position lets corporate actions be shown in rupiah rather than
                as ratios. One lot is 100 shares.
              </p>
            </div>
          ) : null}
        </div>

        <FormMessage state={addState} />
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">
          No stocks tracked yet. Add one above to start receiving alerts.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <WatchlistRow key={item.symbol} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function WatchlistRow({ item }: { item: Item }) {
  const [removeState, removeAction, removePending] = useActionState(
    removeFromWatchlist,
    INITIAL,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateThreshold,
    INITIAL,
  );

  return (
    <li className="rounded-[8px] border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/?symbol=${item.symbol}`}
            className="text-sm font-medium text-text hover:text-accent"
          >
            {item.symbol}
          </Link>
          {item.holding ? (
            <p className="text-xs text-text-subtle">
              {item.holding.lots} lots at Rp{" "}
              {item.holding.avgPrice.toLocaleString("id-ID")}
            </p>
          ) : null}
          {item.lastNotifiedAt ? (
            <p className="text-xs text-text-subtle">
              Last alert {item.lastNotifiedAt.slice(0, 10)}
            </p>
          ) : null}
        </div>

        <form action={removeAction}>
          <input type="hidden" name="symbol" value={item.symbol} />
          <button
            type="submit"
            disabled={removePending}
            className="text-xs text-text-subtle transition-colors hover:text-down disabled:opacity-50"
          >
            Remove
          </button>
        </form>
      </div>

      <form action={updateAction} className="mt-3">
        <input type="hidden" name="symbol" value={item.symbol} />
        <ThresholdField
          name="zScoreThreshold"
          defaultValue={item.zScoreThreshold}
          compact
        />
        <button
          type="submit"
          disabled={updatePending}
          className="mt-1.5 text-xs text-accent hover:underline disabled:opacity-50"
        >
          {updatePending ? "Saving" : "Save threshold"}
        </button>
      </form>

      <FormMessage state={removeState} />
      <FormMessage state={updateState} />
    </li>
  );
}

/**
 * Threshold slider with a plain-language reading of what each value means.
 *
 * Under a normal approximation |z| > 2 is roughly a one-in-twenty session, so
 * the copy converts the statistic into an expected frequency.
 */
function ThresholdField({
  name,
  defaultValue,
  compact = false,
}: {
  name: string;
  defaultValue: number;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  const meaning =
    value >= 3
      ? "Only exceptional moves. Expect an alert a few times a year."
      : value >= 2.5
        ? "Rare moves. Expect an alert every month or two."
        : value >= 2
          ? "Unusual moves. Expect an alert every few weeks."
          : value >= 1.5
            ? "Mildly unusual moves. Expect alerts often."
            : "Almost any deviation. Expect frequent alerts.";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={`${name}-${compact ? "row" : "new"}`}
          className="text-[11px] uppercase tracking-wide text-text-subtle"
        >
          Alert above
        </label>
        <span className="tnum text-xs text-text-muted">
          {value.toFixed(1)} sigma
        </span>
      </div>
      <input
        id={`${name}-${compact ? "row" : "new"}`}
        name={name}
        type="range"
        min={1}
        max={4}
        step={0.1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--accent)]"
        aria-describedby={`${name}-meaning-${compact ? "row" : "new"}`}
      />
      <p
        id={`${name}-meaning-${compact ? "row" : "new"}`}
        className="mt-0.5 text-xs text-text-subtle"
      >
        {meaning}
      </p>
    </div>
  );
}

function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-xs text-down">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-xs text-up">
        {state.success}
      </p>
    );
  }
  return null;
}
