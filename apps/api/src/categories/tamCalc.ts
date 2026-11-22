import { TamEstimateSchema } from "@venturecraft/schemas";
import type { TamEstimate } from "@venturecraft/schemas";

export interface Figure {
  kind: "market_size" | "customer_count" | "price_point";
  label: string;
  value: number;
  currency?: string | null;
  period?: "year" | "month" | null;
  quote: string;
  /** Page the figure was quoted from. */
  source: string;
}

export interface TamResult {
  tam?: TamEstimate;
  bottomUp?: TamEstimate;
  sam?: TamEstimate;
  som?: TamEstimate;
}

// Unsourced defaults, always listed as assumptions so the user can overrule them.
export const SAM_SHARE = { low: 0.1, high: 0.3 } as const;
export const SOM_SHARE = { low: 0.01, high: 0.05 } as const;

const fmt = (f: Figure): string => `${f.label}: ${f.value}${f.currency ? ` ${f.currency}` : ""} (source quote: "${f.quote}")`;

function majorityCurrency(figures: readonly Figure[]): string | undefined {
  const counts = new Map<string, number>();
  for (const f of figures) if (f.currency) counts.set(f.currency, (counts.get(f.currency) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] === "INR" ? -1 : 1))[0]?.[0];
}

function range(values: readonly number[]): { low: number; high: number } {
  return { low: Math.min(...values), high: Math.max(...values) };
}

function topDown(figures: readonly Figure[]): TamEstimate | undefined {
  const currency = majorityCurrency(figures.filter((f) => f.kind === "market_size"));
  const used = figures.filter((f) => f.kind === "market_size" && f.currency === currency && f.value > 0);
  if (!currency || used.length === 0) return undefined;
  return TamEstimateSchema.parse({
    ...range(used.map((f) => f.value)),
    currency,
    method: "top_down",
    assumptions: [
      { statement: "Range spans the published market-size figures below; definitions, years and geographies may differ between sources." },
      ...used.map((f) => ({ statement: fmt(f) })),
    ],
    sources: [...new Set(used.map((f) => f.source))],
  });
}

function bottomUp(figures: readonly Figure[]): TamEstimate | undefined {
  const counts = figures.filter((f) => f.kind === "customer_count" && f.value > 0);
  const currency = majorityCurrency(figures.filter((f) => f.kind === "price_point"));
  const prices = figures.filter((f) => f.kind === "price_point" && f.currency === currency && f.value > 0);
  if (!currency || counts.length === 0 || prices.length === 0) return undefined;
  const yearly = prices.map((f) => f.value * (f.period === "month" ? 12 : 1));
  const customers = range(counts.map((f) => f.value));
  const price = range(yearly);
  return TamEstimateSchema.parse({
    low: customers.low * price.low,
    high: customers.high * price.high,
    currency,
    method: "bottom_up",
    assumptions: [
      { statement: "Customers x yearly price; 100% adoption, so this is a ceiling, not a forecast." },
      { statement: "Monthly prices are annualised x12; prices without a stated period are treated as yearly." },
      ...counts.map((f) => ({ statement: fmt(f) })),
      ...prices.map((f) => ({ statement: fmt(f) })),
    ],
    sources: [...new Set([...counts, ...prices].map((f) => f.source))],
  });
}

function share(base: TamEstimate, s: { low: number; high: number }, label: string, baseLabel: string): TamEstimate {
  return TamEstimateSchema.parse({
    low: Math.round(base.low * s.low),
    high: Math.round(base.high * s.high),
    currency: base.currency,
    method: base.method,
    assumptions: [
      { statement: `ASSUMPTION (unsourced default, adjust it): ${label} is ${s.low * 100}% to ${s.high * 100}% of ${baseLabel}.` },
      ...base.assumptions,
    ],
    sources: base.sources,
  });
}

/** TAM from sourced figures only. SAM and SOM apply explicit, unsourced share assumptions to TAM. */
export function buildEstimates(figures: readonly Figure[]): TamResult {
  const tam = topDown(figures);
  const bu = bottomUp(figures);
  const base = tam ?? bu;
  const sam = base ? share(base, SAM_SHARE, "the serviceable market (SAM)", "TAM") : undefined;
  const som = sam ? share(sam, SOM_SHARE, "the obtainable market (SOM)", "SAM") : undefined;
  return { tam, bottomUp: bu, sam, som };
}
