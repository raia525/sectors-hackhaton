import type { ReactNode } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Badge } from "@/components/ui/primitives";
import { BUTTON_SMALL } from "@/components/formStyles";
import type { FormState } from "@/lib/forms/state";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface SymbolRow {
  symbol: string;
  isActive: boolean;
  name: string | null;
  /** Extra line under the name: a note form, the last run result, and so on. */
  extra?: ReactNode;
}

/**
 * The ordered stock list shared by the daily universe and the ticker strip:
 * position, pause, move up or down or straight to a position, and remove.
 */
export function SymbolListEditor({
  rows,
  update,
  remove,
  labels,
}: {
  rows: SymbolRow[];
  update: Action;
  remove: Action;
  labels: {
    up: string;
    down: string;
    pause: string;
    resume: string;
    paused: string;
    moveTo: string;
    move: string;
    remove: string;
    confirmRemove: string;
    position: string;
  };
}) {
  return (
    <ol className="divide-y divide-border">
      {rows.map((row, i) => (
        <li key={row.symbol} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-text">
              <span className="tnum mr-2 text-text-subtle">{i + 1}.</span>
              {row.symbol}
              {row.name ? <span className="ml-2 font-normal text-text-muted">{row.name}</span> : null}
              {row.isActive ? null : (
                <span className="ml-2">
                  <Badge tone="neutral">{labels.paused}</Badge>
                </span>
              )}
            </p>
            {row.extra ? <div className="mt-1.5">{row.extra}</div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionForm action={update} className="flex items-center gap-1.5">
              <input type="hidden" name="symbol" value={row.symbol} />
              <input type="hidden" name="intent" value="move" />
              <label className="sr-only" htmlFor={`pos-${row.symbol}`}>
                {labels.position}
              </label>
              <input
                id={`pos-${row.symbol}`}
                name="position"
                type="number"
                min={1}
                max={rows.length}
                defaultValue={i + 1}
                className="h-8 w-16 rounded-full border border-border bg-surface px-3 text-xs text-text focus:border-accent focus:outline-none"
              />
              <SubmitButton className={BUTTON_SMALL}>{labels.move}</SubmitButton>
            </ActionForm>
            {(["up", "down", "toggle"] as const).map((intent) => (
              <ActionForm key={intent} action={update}>
                <input type="hidden" name="symbol" value={row.symbol} />
                <input type="hidden" name="intent" value={intent} />
                <SubmitButton className={BUTTON_SMALL}>
                  {intent === "up"
                    ? labels.up
                    : intent === "down"
                      ? labels.down
                      : row.isActive
                        ? labels.pause
                        : labels.resume}
                </SubmitButton>
              </ActionForm>
            ))}
            <ActionForm action={remove} confirm={labels.confirmRemove}>
              <input type="hidden" name="symbol" value={row.symbol} />
              <SubmitButton className={`${BUTTON_SMALL} text-down`}>{labels.remove}</SubmitButton>
            </ActionForm>
          </div>
        </li>
      ))}
    </ol>
  );
}
