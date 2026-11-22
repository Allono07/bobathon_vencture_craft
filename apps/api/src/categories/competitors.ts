import { z } from "zod";
import { CompetitorSchema } from "@venturecraft/schemas";
import type { Competitor } from "@venturecraft/schemas";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { gather } from "../research/pipeline.js";
import { appearsIn } from "../research/sourceGuard.js";
import { FIXTURE_RESULTS } from "./fixtures.js";
import { competitorQueries } from "./queries.js";
import type { CategoryModule } from "./types.js";

const ItemSchema = z.strictObject({
  name: z.string().min(1).max(200),
  url: z.string(),
  region: z.enum(["india", "global"]),
  offering: z.string().min(1).max(500),
  pricing: z.string().max(300).nullish(),
  positioning: z.string().min(1).max(500),
  strengths: z.array(z.string().min(1).max(200)).max(8),
  weaknesses: z.array(z.string().min(1).max(200)).max(8),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

export function competitorSpec(now: Date): ExtractSpec<Item, Competitor> {
  return {
    instruction: "List companies that offer a product competing with the founder's idea. Prefer companies based in India, then global ones.",
    fieldGuide:
      "name, url (company website, copied exactly from the page), region (india|global), offering, pricing (only if stated), positioning, strengths[], weaknesses[] (only what the page supports), sourceIndex",
    itemSchema: ItemSchema,
    build: (item, docs) => {
      const doc = pageAt(docs, item.sourceIndex);
      if (item.url !== doc.url && !appearsIn(item.url, doc.text)) throw new Error("url not on source page");
      return {
        name: item.name,
        url: item.url,
        region: item.region,
        offering: item.offering,
        pricing: item.pricing ?? undefined,
        positioning: item.positioning,
        strengths: item.strengths,
        weaknesses: item.weaknesses,
        source: doc.url,
        fetchedAt: now.toISOString(),
      };
    },
    finalSchema: CompetitorSchema,
  };
}

/** India first, then global; duplicates by name removed. */
export function rankCompetitors(items: readonly Competitor[]): Competitor[] {
  const seen = new Set<string>();
  const unique = items.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...unique.filter((c) => c.region === "india"), ...unique.filter((c) => c.region === "global")];
}

export const competitorsModule: CategoryModule = {
  category: "competitors",
  needs: ["sector", "targetCustomer"],
  async run(ctx) {
    if (ctx.fixtures) return { ...FIXTURE_RESULTS.competitors, fixture: true };
    const docs = await gather({ category: "competitors", web: ctx.web, cache: ctx.cache, emit: ctx.emit }, competitorQueries(ctx.profile));
    const items = rankCompetitors(await extractItems(ctx.llm, competitorSpec(ctx.now()), docs));
    return { items, notFound: items.length === 0 };
  },
};
