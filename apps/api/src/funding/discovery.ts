import { z } from "zod";
import { FundingProgramSchema } from "@venturecraft/schemas";
import type { FundingProgram } from "@venturecraft/schemas";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { appearsIn, hostEndsWith } from "../research/sourceGuard.js";
import type { LlmClient } from "../llm/client.js";
import type { FetchedPage } from "../tinyfish/types.js";

/** Live discovery only trusts official domains; candidates are flagged for human review, never merged. */
export const OFFICIAL_SCHEME_DOMAINS = ["gov.in", "nic.in", "startupindia.gov.in", "startupkarnataka.in", "kitven.in"] as const;

const ItemSchema = z.strictObject({
  name: z.string().min(1).max(200),
  type: z.enum(["grant", "credits", "accelerator", "angel-network", "vc", "govt-scheme"]),
  provider: z.string().min(1).max(200),
  benefit: z.string().min(1).max(500),
  applyUrl: z.string(),
  eligibilityNotes: z.array(z.string().min(1).max(300)).max(8),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function schemeSpec(now: Date): ExtractSpec<Item, FundingProgram> {
  return {
    instruction: "List government or state funding schemes for startups that the page describes. Do not state deadlines or open/closed status.",
    fieldGuide: "name, type, provider, benefit (as stated), applyUrl (printed on the page), eligibilityNotes[] (as stated), sourceIndex",
    itemSchema: ItemSchema,
    build: (item, docs) => {
      const doc = pageAt(docs, item.sourceIndex);
      if (!hostEndsWith(doc.url, OFFICIAL_SCHEME_DOMAINS)) throw new Error("source is not an official domain");
      if (item.applyUrl !== doc.url && !appearsIn(item.applyUrl, doc.text)) throw new Error("applyUrl not on source page");
      return {
        id: slug(item.name),
        name: item.name,
        type: item.type,
        provider: item.provider,
        eligibility: { notes: item.eligibilityNotes },
        benefit: item.benefit,
        applyUrl: item.applyUrl,
        deadline: "unknown",
        status: "unknown",
        sourceUrl: doc.url,
        lastVerified: now.toISOString(),
      };
    },
    finalSchema: FundingProgramSchema,
  };
}

/** Drops candidates that duplicate a curated program (by normalised name) or each other. */
export function newCandidates(found: readonly FundingProgram[], curated: readonly FundingProgram[]): FundingProgram[] {
  const known = new Set(curated.map((p) => slug(p.name)));
  const out: FundingProgram[] = [];
  for (const p of found) {
    if (known.has(slug(p.name))) continue;
    known.add(slug(p.name));
    out.push(p);
  }
  return out;
}

export function discoverSchemes(llm: LlmClient, docs: readonly FetchedPage[], curated: readonly FundingProgram[], now: Date): Promise<FundingProgram[]> {
  return extractItems(llm, schemeSpec(now), docs).then((found) => newCandidates(found, curated));
}
