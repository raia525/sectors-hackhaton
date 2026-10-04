"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addToWatchlist,
  removeFromWatchlist,
  updateWatchItem,
  type ActionState,
} from "@/app/portfolio/actions";
import { SymbolCombobox, type DirectoryMatch } from "./SymbolCombobox";
import { useTranslation } from "@/lib/i18n/client";

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
  notifyOnCorporateAction: boolean;
  notifyOnSmartMoney: boolean;
  lastNotifiedAt: string | null;
  holding: { lots: number; avgPrice: number } | null;
  /** The latest stored analysis, if the daily run has reached this stock. */
  latest: { zScore: number; runDate: string; signal: boolean } | null;
}

const INITIAL: ActionState = {};

export function WatchlistManager({ items, defaultThreshold = 2 }: { items: Item[]; defaultThreshold?: number }) {
  const { t } = useTranslation();
  const [addState, addAction, addPending] = useActionState(addToWatchlist, INITIAL);
  const [showPosition, setShowPosition] = useState(false);
  const [symbolValue, setSymbolValue] = useState("");

  return (
    <div className="space-y-6">
      <form action={addAction} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[140px] flex-1">
            <label htmlFor="watch-symbol" className="sr-only">
              {t("watchlist.tickerLabel")}
            </label>
            <SymbolCombobox
              id="watch-symbol"
              value={symbolValue}
              onChange={setSymbolValue}
              onSelect={(match: DirectoryMatch) => setSymbolValue(match.symbol)}
              placeholder={t("watchlist.addTickerPlaceholder")}
              inputClassName="w-full rounded-full border border-border bg-surface-raised px-3 py-2 text-sm uppercase text-text placeholder:normal-case placeholder:text-text-subtle focus:border-accent focus:outline-none"
            />
            {/* A plain input mirrors the combobox's value into the form
                submission, since the combobox itself has no name attribute. */}
            <input type="hidden" name="symbol" value={symbolValue} />
          </div>
          <button
            type="submit"
            disabled={addPending}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {addPending ? t("watchlist.adding") : t("watchlist.add")}
          </button>
        </div>

        <ThresholdField id="threshold-new" defaultValue={defaultThreshold} />

        <div>
          <button
            type="button"
            onClick={() => setShowPosition(!showPosition)}
            aria-expanded={showPosition}
            className="text-xs text-text-subtle underline-offset-2 hover:text-text-muted hover:underline"
          >
            {showPosition ? t("watchlist.hidePosition") : t("watchlist.showPosition")}
          </button>

          {showPosition ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-text-subtle">
                  {t("watchlist.lots")}
                </span>
                <input
                  name="lots"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="10"
                  className="mt-1 w-full rounded-full border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wide text-text-subtle">
                  {t("watchlist.avgPrice")}
                </span>
                <input
                  name="avgPrice"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="4500"
                  className="mt-1 w-full rounded-full border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                />
              </label>
              <p className="col-span-2 text-xs text-text-subtle">
                {t("watchlist.positionHint")}
              </p>
            </div>
          ) : null}
        </div>

        <FormMessage state={addState} />
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">{t("watchlist.empty")}</p>
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
  const { t } = useTranslation();
  const [removeState, removeAction, removePending] = useActionState(removeFromWatchlist, INITIAL);
  const [updateState, updateAction, updatePending] = useActionState(updateWatchItem, INITIAL);
  const id = item.symbol.toLowerCase();

  return (
    <li className="rounded-[var(--radius-sm)] border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/stocks?symbol=${item.symbol}`} className="text-sm font-bold text-text hover:text-accent">
              {item.symbol}
            </Link>
            {item.latest ? (
              <span
                className={`tnum rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.latest.signal ? "bg-signal-extreme/12 text-signal-extreme" : "bg-surface text-text-muted"
                }`}
              >
                {t(item.latest.signal ? "watchlist.latestSignal" : "watchlist.latestQuiet", {
                  z: item.latest.zScore.toFixed(1),
                  date: item.latest.runDate,
                })}
              </span>
            ) : (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-text-subtle">
                {t("watchlist.latestNone")}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-subtle">
            {t("watchlist.alertSummary", { z: item.zScoreThreshold.toFixed(1) })}
            {item.holding
              ? ` · ${t("watchlist.lotsAt", {
                  lots: item.holding.lots,
                  price: item.holding.avgPrice.toLocaleString("id-ID"),
                })}`
              : ""}
            {item.lastNotifiedAt ? ` · ${t("watchlist.lastAlert", { date: item.lastNotifiedAt.slice(0, 10) })}` : ""}
          </p>
        </div>

        <form action={removeAction}>
          <input type="hidden" name="symbol" value={item.symbol} />
          <button
            type="submit"
            disabled={removePending}
            className="text-xs text-text-subtle transition-colors hover:text-down disabled:opacity-50"
          >
            {t("watchlist.remove")}
          </button>
        </form>
      </div>

      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-accent hover:underline">
          {t("watchlist.settings")}
        </summary>
        <form action={updateAction} className="mt-3 space-y-3">
          <input type="hidden" name="symbol" value={item.symbol} />
          <ThresholdField id={`threshold-${id}`} defaultValue={item.zScoreThreshold} />
          <fieldset className="space-y-1.5">
            <legend className="text-[11px] uppercase tracking-wide text-text-subtle">{t("watchlist.alsoAlert")}</legend>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                name="notifyOnCorporateAction"
                defaultChecked={item.notifyOnCorporateAction}
                className="h-4 w-4 accent-accent-bright"
              />
              {t("watchlist.notifyCorporateAction")}
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                name="notifyOnSmartMoney"
                defaultChecked={item.notifyOnSmartMoney}
                className="h-4 w-4 accent-accent-bright"
              />
              {t("watchlist.notifySmartMoney")}
            </label>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-text-subtle">{t("watchlist.lots")}</span>
              <input
                name="lots"
                type="number"
                min={0}
                step={1}
                defaultValue={item.holding?.lots ?? ""}
                className="mt-1 w-full rounded-full border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wide text-text-subtle">{t("watchlist.avgPrice")}</span>
              <input
                name="avgPrice"
                type="number"
                min={0}
                step="any"
                defaultValue={item.holding?.avgPrice ?? ""}
                className="mt-1 w-full rounded-full border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
              />
            </label>
            <p className="col-span-2 text-xs text-text-subtle">{t("watchlist.positionClearHint")}</p>
          </div>
          <button
            type="submit"
            disabled={updatePending}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {updatePending ? t("watchlist.saving") : t("watchlist.saveSettings")}
          </button>
        </form>
      </details>

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
function ThresholdField({ id, defaultValue }: { id: string; defaultValue: number }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);

  const meaningKey =
    value >= 3
      ? "watchlist.meaning.exceptional"
      : value >= 2.5
        ? "watchlist.meaning.rare"
        : value >= 2
          ? "watchlist.meaning.unusual"
          : value >= 1.5
            ? "watchlist.meaning.mild"
            : "watchlist.meaning.frequent";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-wide text-text-subtle"
        >
          {t("watchlist.alertAbove")}
        </label>
        <span className="tnum text-xs text-text-muted">
          {t("watchlist.sigma", { value: value.toFixed(1) })}
        </span>
      </div>
      <input
        id={id}
        name="zScoreThreshold"
        type="range"
        min={1}
        max={4}
        step={0.1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--accent)]"
        aria-describedby={`${id}-meaning`}
      />
      <p
        id={`${id}-meaning`}
        className="mt-0.5 text-xs text-text-subtle"
      >
        {t(meaningKey)}
      </p>
    </div>
  );
}

function FormMessage({ state }: { state: ActionState }) {
  const { tm } = useTranslation();

  if (state.error) {
    return (
      <p role="alert" className="text-xs text-down">
        {tm(state.error)}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-xs text-up">
        {tm(state.success)}
      </p>
    );
  }
  return null;
}
