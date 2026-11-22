import { z } from "zod";
import { LeadSchema } from "@venturecraft/schemas";
import type { Lead } from "@venturecraft/schemas";
import { extractItems, pageAt } from "../research/extract.js";
import type { ExtractSpec } from "../research/extract.js";
import { appearsIn, isPersonalMail } from "../research/sourceGuard.js";
import type { LlmClient } from "../llm/client.js";
import type { FetchedPage } from "../tinyfish/types.js";

const ItemSchema = z.strictObject({
  name: z.string().min(1).max(200),
  url: z.string(),
  whyRelevant: z.string().min(1).max(500),
  location: z.string().min(1).max(200),
  businessEmail: z.string().nullish(),
  businessPhone: z.string().nullish(),
  address: z.string().nullish(),
  stage: z.string().nullish(),
  ticketSize: z.string().nullish(),
  sourceIndex: z.number().int(),
});
type Item = z.infer<typeof ItemSchema>;

/** Keeps a contact value only if the page states it verbatim; personal-looking mail addresses are never kept. */
function verified(value: string | null | undefined, text: string, extra: (v: string) => boolean = () => true): string | undefined {
  return value && appearsIn(value, text) && extra(value) ? value : undefined;
}

export function leadSpec(type: Lead["type"], now: Date, confidence: Lead["confidence"] = "medium"): ExtractSpec<Item, Lead> {
  return {
    instruction:
      type === "service_provider"
        ? "List firms (company secretaries, chartered accountants, legal firms) that help startups register in Bengaluru. Organizations only; no individual people."
        : "List incubators, accelerators, angel networks and funds relevant to the founder. Organizations and programs only; no individual people.",
    fieldGuide:
      "name (organization), url (its website, copied from the page), whyRelevant, location, businessEmail/businessPhone/address (only if printed as the organization's public business contact), stage, ticketSize, sourceIndex",
    itemSchema: ItemSchema,
    build: (item, docs) => {
      const doc = pageAt(docs, item.sourceIndex);
      if (item.url !== doc.url && !appearsIn(item.url, doc.text)) throw new Error("url not on source page");
      const businessEmail = verified(item.businessEmail, doc.text, (v) => !isPersonalMail(v));
      const businessPhone = verified(item.businessPhone, doc.text);
      const address = verified(item.address, doc.text);
      const contactPublic = businessEmail || businessPhone || address ? { businessEmail, businessPhone, address } : undefined;
      return {
        name: item.name,
        type,
        url: item.url,
        whyRelevant: item.whyRelevant,
        location: item.location,
        contactPublic,
        stage: item.stage ?? undefined,
        ticketSize: item.ticketSize ?? undefined,
        source: doc.url,
        fetchedAt: now.toISOString(),
        confidence,
      };
    },
    finalSchema: LeadSchema,
  };
}

export function extractLeads(llm: LlmClient, docs: readonly FetchedPage[], type: Lead["type"], now: Date): Promise<Lead[]> {
  return extractItems(llm, leadSpec(type, now), docs);
}
