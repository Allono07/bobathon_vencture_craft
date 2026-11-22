import type { BusinessProfileDraft, ProfileField } from "@venturecraft/schemas";
import type { ExtractedProfile, ProfileExtractor } from "./extractProfile.js";

const SECTORS: ReadonlyArray<readonly [string, RegExp]> = [
  ["fintech", /\b(fintech|payments?|lending|invoice|banking|insurance)\b/i],
  ["edtech", /\b(edtech|education|learning|students?|school)\b/i],
  ["healthtech", /\b(health|healthcare|clinic|hospital|medical|wellness)\b/i],
  ["agritech", /\b(agri|agriculture|farmers?|farming)\b/i],
  ["logistics", /\b(logistics|delivery|supply chain|warehouse)\b/i],
  ["e-commerce", /\b(e-?commerce|marketplace|online store)\b/i],
  ["saas", /\b(saas|software platform|dashboard)\b/i],
];
const STAGES: ReadonlyArray<readonly [BusinessProfileDraft["stage"], RegExp]> = [
  ["growth", /\b(scaling|series [a-c]|growth stage)\b/i],
  ["early_revenue", /\b(paying customers|revenue|launched|live users)\b/i],
  ["mvp", /\b(mvp|beta|pilot)\b/i],
  ["prototype", /\b(prototype|proof of concept|poc)\b/i],
  ["idea", /\b(idea|thinking of|plan to|planning to)\b/i],
];
const INCORPORATION: ReadonlyArray<readonly [BusinessProfileDraft["incorporationStatus"], RegExp]> = [
  ["private_limited", /\b(private limited|pvt\.? ltd)\b/i],
  ["llp", /\bllp\b/i],
  ["proprietorship", /\bproprietorship\b/i],
  ["not_incorporated", /\b(not (yet )?incorporated|unregistered)\b/i],
];

/**
 * Keyword fallback used only when no LLM key is configured (local development and E2E).
 * It fills what the text clearly states and marks it inferred; real runs use the LLM extractor.
 */
export class HeuristicProfileExtractor implements ProfileExtractor {
  async extract(text: string): Promise<ExtractedProfile> {
    const draft: BusinessProfileDraft = { ideaSummary: text.slice(0, 300), city: "Bengaluru" };
    const inferred: ProfileField[] = ["city"];
    const set = <K extends ProfileField>(field: K, value: BusinessProfileDraft[K]): void => {
      draft[field] = value;
      inferred.push(field);
    };

    const sector = SECTORS.find(([, re]) => re.test(text));
    if (sector) set("sector", sector[0]);
    const stage = STAGES.find(([, re]) => re.test(text));
    if (stage?.[0]) set("stage", stage[0]);
    const inc = INCORPORATION.find(([, re]) => re.test(text));
    if (inc?.[0]) set("incorporationStatus", inc[0]);
    const customer = /\bfor ([a-z0-9 -]{3,60}?)(?:[.,;]| who | that |$)/i.exec(text);
    if (customer?.[1]) set("targetCustomer", customer[1].trim());
    if (/\bsaas\b|subscription/i.test(text)) set("businessModel", "B2B SaaS");
    else if (/\bmarketplace\b/i.test(text)) set("businessModel", "Marketplace");
    return { draft, inferred };
  }
}
