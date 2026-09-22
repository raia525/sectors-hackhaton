/**
 * Credit budget enforcement.
 *
 * The hackathon grants a fixed 1,000 credits for the whole build. Running out
 * mid-demo is an unrecoverable failure, so spending is metered in code rather
 * than tracked by hand: the ledger can refuse a call, and it reserves a floor
 * that only the live demo path may spend.
 */

export interface CreditLedger {
  /**
   * Returns false when the call would breach the budget. `priority` callers
   * may draw on the reserve; background work may not.
   */
  tryConsume(cost: number, label: string, priority?: boolean): Promise<boolean>;
  /** Returns credits after a failed upstream call. */
  refund(cost: number): Promise<void>;
  remaining(): Promise<number>;
  spent(): Promise<number>;
}

export interface LedgerSnapshot {
  limit: number;
  spent: number;
  remaining: number;
  reserve: number;
  byLabel: Record<string, number>;
}

/**
 * In-process ledger.
 *
 * `reserve` holds back credits that ordinary background work may not touch, so
 * an over-eager refresh job cannot starve the interactive demo. Callers marked
 * `priority` may draw from the reserve.
 */
export class MemoryCreditLedger implements CreditLedger {
  private used = 0;
  private readonly usage = new Map<string, number>();

  constructor(
    private readonly limit = 1000,
    private readonly reserve = 150,
  ) {
    if (reserve >= limit) {
      throw new Error("Credit reserve must be smaller than the total limit.");
    }
  }

  async tryConsume(cost: number, label: string, priority = false): Promise<boolean> {
    if (cost <= 0) return true;
    const ceiling = priority ? this.limit : this.limit - this.reserve;
    if (this.used + cost > ceiling) return false;

    this.used += cost;
    this.usage.set(label, (this.usage.get(label) ?? 0) + cost);
    return true;
  }

  async refund(cost: number): Promise<void> {
    this.used = Math.max(0, this.used - cost);
  }

  async remaining(): Promise<number> {
    return Math.max(0, this.limit - this.used);
  }

  async spent(): Promise<number> {
    return this.used;
  }

  snapshot(): LedgerSnapshot {
    return {
      limit: this.limit,
      spent: this.used,
      remaining: Math.max(0, this.limit - this.used),
      reserve: this.reserve,
      byLabel: Object.fromEntries(this.usage),
    };
  }
}

/** Ledger with no limit, for unit tests that are not exercising the budget. */
export class UnlimitedCreditLedger implements CreditLedger {
  private used = 0;
  async tryConsume(cost: number): Promise<boolean> {
    this.used += cost;
    return true;
  }
  async refund(cost: number): Promise<void> {
    this.used -= cost;
  }
  async remaining(): Promise<number> {
    return Number.POSITIVE_INFINITY;
  }
  async spent(): Promise<number> {
    return this.used;
  }
}
