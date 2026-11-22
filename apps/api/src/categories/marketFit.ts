import { z } from "zod";
import { MarketFitItemSchema } from "@venturecraft/schemas";
import type { MarketFitItem } from "@venturecraft/schemas";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { gather } from "../research/pipeline.js";
import { appearsIn } from "../research/sourceGuard.js";
import { FIXTURE_RESULTS } from "./fixtures.js";
import { marketFitQueries } from "./queries.js";
import type { CategoryModule } from "./types.js";

const ItemSchema = z.strictObject({
  kind: z.enum(["audience_segment", "demand_signal"]),
  statement: z.string().min(1).max(500),
  quote: z.string().min(1),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

export function marketFitSpec(now: Date): ExtractSpec<Item, MarketFitItem> {
  return {
    instruction: "Extract who the audience segments are for this idea and any demand signals (adoption, surveys, growth) the pages state. Quote the supporting sentence verbatim.",
    fieldGuide: "kind (audience_segment|demand_signal), statement, quote (verbatim from the page), sourceIndex",
    itemSchema: ItemSchema,
    build: (item, docs) => {
      const doc = pageAt(docs, item.sourceIndex);
      if (!appearsIn(item.quote, doc.text)) throw new Error("quote not on source page");
      return { kind: item.kind, statement: item.statement, source: doc.url, fetchedAt: now.toISOString() };
    },
    finalSchema: MarketFitItemSchema,
  };
}

export const marketFitModule: CategoryModule = {
  category: "market_fit",
  needs: ["targetCustomer", "sector"],
  async run(ctx) {
    if (ctx.fixtures) return { ...FIXTURE_RESULTS.market_fit, fixture: true };
    const docs = await gather({ category: "market_fit", web: ctx.web, cache: ctx.cache, emit: ctx.emit }, marketFitQueries(ctx.profile));
    const items = await extractItems(ctx.llm, marketFitSpec(ctx.now()), docs);
    return { items, notFound: items.length === 0 };
  },
};
