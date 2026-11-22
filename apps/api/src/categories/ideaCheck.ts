import { z } from "zod";
import { IdeaCheckSchema, UrlSchema } from "@venturecraft/schemas";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { gather } from "../research/pipeline.js";
import { appearsIn } from "../research/sourceGuard.js";
import { FIXTURE_RESULTS } from "./fixtures.js";
import { ideaCheckQueries } from "./queries.js";
import type { CategoryModule } from "./types.js";

const Similar = IdeaCheckSchema.shape.similar.element;
type SimilarItem = z.infer<typeof Similar>;

const ItemSchema = z.strictObject({
  name: z.string().min(1),
  url: z.string(),
  similarity: z.number().min(0).max(1),
  evidence: z.string().min(1).max(500),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

const Wrapped = z.strictObject({ similar: Similar, source: UrlSchema });
type Found = z.infer<typeof Wrapped>;

export function ideaSpec(now: Date): ExtractSpec<Item, Found> {
  return {
    instruction: "List existing products that are similar to the founder's idea and rate similarity from 0 (unrelated) to 1 (near identical), with a one-sentence evidence statement taken from the page.",
    fieldGuide: "name, url (product website, copied exactly from the page), similarity 0-1, evidence, sourceIndex",
    itemSchema: ItemSchema,
    build: (item, docs) => {
      const doc = pageAt(docs, item.sourceIndex);
      if (item.url !== doc.url && !appearsIn(item.url, doc.text)) throw new Error("url not on source page");
      return {
        similar: { name: item.name, url: item.url, similarity: item.similarity, evidence: item.evidence, fetchedAt: now.toISOString() },
        source: doc.url,
      };
    },
    finalSchema: Wrapped,
  };
}

export type Verdict = "crowded" | "emerging" | "open";

/** 4+ close matches (similarity >= 0.7) is crowded, 1-3 emerging, none open. */
export function verdictFor(similar: readonly SimilarItem[]): Verdict {
  const close = similar.filter((s) => s.similarity >= 0.7).length;
  return close >= 4 ? "crowded" : close >= 1 ? "emerging" : "open";
}

export const ideaCheckModule: CategoryModule = {
  category: "idea_check",
  needs: ["ideaSummary", "sector"],
  async run(ctx) {
    if (ctx.fixtures) return { ...FIXTURE_RESULTS.idea_check, fixture: true };
    const docs = await gather({ category: "idea_check", web: ctx.web, cache: ctx.cache, emit: ctx.emit }, ideaCheckQueries(ctx.profile));
    const found = (await extractItems(ctx.llm, ideaSpec(ctx.now()), docs)).sort((a, b) => b.similar.similarity - a.similar.similarity);
    if (found.length === 0) return { notFound: true };
    const similar = found.map((f) => f.similar);
    return {
      verdict: verdictFor(similar),
      similar,
      evidence: found.map((f) => ({ claim: f.similar.evidence, source: f.source })),
      notFound: false,
    };
  },
};
