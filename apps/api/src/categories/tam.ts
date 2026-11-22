import { z } from "zod";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { gather } from "../research/pipeline.js";
import { appearsIn } from "../research/sourceGuard.js";
import { FIXTURE_RESULTS } from "./fixtures.js";
import { tamQueries } from "./queries.js";
import { buildEstimates } from "./tamCalc.js";
import type { Figure } from "./tamCalc.js";
import type { CategoryModule } from "./types.js";

const ItemSchema = z.strictObject({
  kind: z.enum(["market_size", "customer_count", "price_point"]),
  label: z.string().min(1).max(200),
  value: z.number().positive(),
  currency: z.string().length(3).nullish(),
  period: z.enum(["year", "month"]).nullish(),
  quote: z.string().min(1),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

const FigureShape = z.custom<Figure>();

export const tamSpec: ExtractSpec<Item, Figure> = {
  instruction:
    "Extract numeric figures that pages state: market sizes (convert nothing; give the number in the currency stated, as a plain number, e.g. 5 crore = 50000000), counts of potential customers, and price points. Quote the supporting sentence verbatim.",
  fieldGuide: "kind (market_size|customer_count|price_point), label, value (number), currency (3-letter, omit for counts), period (year|month, price points only), quote (verbatim), sourceIndex",
  itemSchema: ItemSchema,
  build: (item, docs) => {
    const doc = pageAt(docs, item.sourceIndex);
    if (!appearsIn(item.quote, doc.text)) throw new Error("quote not on source page");
    return { kind: item.kind, label: item.label, value: item.value, currency: item.currency ?? undefined, period: item.period ?? undefined, quote: item.quote, source: doc.url };
  },
  finalSchema: FigureShape,
};

export const tamModule: CategoryModule = {
  category: "tam_sam_som",
  needs: ["sector", "targetCustomer", "businessModel"],
  async run(ctx) {
    if (ctx.fixtures) return { ...FIXTURE_RESULTS.tam_sam_som, fixture: true };
    const docs = await gather({ category: "tam_sam_som", web: ctx.web, cache: ctx.cache, emit: ctx.emit }, tamQueries(ctx.profile));
    const figures = await extractItems(ctx.llm, tamSpec, docs);
    const estimates = buildEstimates(figures);
    return { ...estimates, notFound: !estimates.tam && !estimates.bottomUp };
  },
};
