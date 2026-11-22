import { z } from "zod";
import { ComplianceItemSchema } from "@venturecraft/schemas";
import type { BusinessProfile, ComplianceItem, Lead } from "@venturecraft/schemas";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { gather } from "../research/pipeline.js";
import { appearsIn, hostEndsWith } from "../research/sourceGuard.js";
import { FIXTURE_RESULTS } from "./fixtures.js";
import { extractLeads } from "./leads.js";
import { legalQueries, providerQueries } from "./queries.js";
import type { CategoryModule } from "./types.js";

// officialUrl must be a government domain, so a page cannot pass off a private site as "official".
const OFFICIAL_SUFFIXES = ["gov.in", "nic.in"] as const;

export interface EntityRecommendation {
  recommended: string;
  reasoning: string[];
  alternatives: string[];
  notLegalAdvice: true;
}

/** General, rule-based guidance from the profile. Not sourced from the web and not legal advice. */
export function recommendEntity(p: BusinessProfile): EntityRecommendation {
  const reasoning: string[] = [];
  if (p.incorporationStatus && p.incorporationStatus !== "not_incorporated") {
    reasoning.push(`You are already registered as: ${p.incorporationStatus.replace("_", " ")}. Review with a professional whether it still fits your plans.`);
    return { recommended: p.incorporationStatus, reasoning, alternatives: [], notLegalAdvice: true };
  }
  const external = p.fundingNeed !== undefined && p.fundingNeed !== "none" && p.bootstrapped !== true;
  if (external) {
    reasoning.push("You plan to raise outside funding; equity investors and many startup schemes generally expect a company structure.");
    return { recommended: "private_limited", reasoning, alternatives: ["llp", "opc"], notLegalAdvice: true };
  }
  reasoning.push("No outside funding planned: a lighter structure can reduce compliance, but it may limit equity fundraising later.");
  return { recommended: "llp", reasoning, alternatives: ["private_limited", "opc", "proprietorship"], notLegalAdvice: true };
}

const ItemSchema = z.strictObject({
  title: z.string().min(1).max(200),
  why: z.string().min(1).max(500),
  authority: z.string().min(1).max(200),
  steps: z.array(z.string().min(1).max(300)).min(1),
  estCost: z.string().max(200).nullish(),
  officialUrl: z.string(),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

export function complianceSpec(providers: Lead[]): ExtractSpec<Item, ComplianceItem> {
  return {
    instruction: "List registrations or compliance steps a startup like the founder's needs in India/Karnataka, with the steps as the page describes them.",
    fieldGuide: "title, why, authority, steps[], estCost (only if stated), officialUrl (a gov.in or nic.in page printed on the source page), sourceIndex",
    itemSchema: ItemSchema,
    build: (item, docs) => {
      const doc = pageAt(docs, item.sourceIndex);
      const official = item.officialUrl === doc.url || appearsIn(item.officialUrl, doc.text);
      if (!official || !hostEndsWith(item.officialUrl, OFFICIAL_SUFFIXES)) throw new Error("officialUrl not an official page from the source");
      return { ...item, estCost: item.estCost ?? undefined, providers, notLegalAdvice: true };
    },
    finalSchema: ComplianceItemSchema,
  };
}

export const legalModule: CategoryModule = {
  category: "legal",
  needs: ["incorporationStatus"],
  async run(ctx) {
    const entityRecommendation = recommendEntity(ctx.profile);
    if (ctx.fixtures) return { ...FIXTURE_RESULTS.legal, entityRecommendation, fixture: true };
    const base = { category: "legal" as const, web: ctx.web, cache: ctx.cache, emit: ctx.emit };
    const [docs, providerDocs] = await Promise.all([gather(base, legalQueries(ctx.profile)), gather(base, providerQueries(ctx.profile), { maxPages: 3 }).catch(() => [])]);
    const providers = await extractLeads(ctx.llm, providerDocs, "service_provider", ctx.now());
    const items = await extractItems(ctx.llm, complianceSpec(providers), docs);
    return { entityRecommendation, items, notFound: items.length === 0 };
  },
};
