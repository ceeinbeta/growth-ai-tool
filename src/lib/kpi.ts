// KPI helpers for the Overview tiles. Real data only; change labels need both periods.
export const KPI_PERIODS = [7, 30, 90] as const;
export type KpiPeriod = (typeof KPI_PERIODS)[number];

export function parsePeriod(value: unknown): KpiPeriod {
  const n = Number(value);
  return (KPI_PERIODS as readonly number[]).includes(n) ? (n as KpiPeriod) : 30;
}

export type Change =
  | { kind: "up" | "down" | "flat"; text: string }
  | { kind: "none"; reason: string };

/** Change vs the previous equal period. "Not enough data yet" when there is nothing to compare with. */
export function changeVsPrevious(current: number, previous: number): Change {
  if (previous === 0) {
    return current === 0
      ? { kind: "none", reason: "No events in either period yet." }
      : { kind: "none", reason: "Nothing in the previous period to compare with." };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { kind: "flat", text: "Same as the previous period" };
  return { kind: pct > 0 ? "up" : "down", text: `${pct > 0 ? "+" : ""}${pct}% vs the previous period` };
}

/** Measured conversion rate, or null when there were no visitors (never show a fake 0%). */
export function conversionRate(conversions: number, visitors: number): number | null {
  return visitors > 0 ? conversions / visitors : null;
}

export function formatPct(rate: number): string {
  const pct = rate * 100;
  return `${pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10}%`;
}
