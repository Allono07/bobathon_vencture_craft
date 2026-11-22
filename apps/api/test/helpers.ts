import type { BusinessProfileDraft, ProfileField } from "@venturecraft/schemas";
import { buildServer } from "../src/server.js";
import type { ExtractedProfile, ProfileExtractor } from "../src/llm/extractProfile.js";
import { InMemorySessionStore } from "../src/session/store.js";
import type { ServiceDeps } from "../src/session/service.js";
import type { Session } from "../src/session/types.js";

export const COMPLETE: BusinessProfileDraft = {
  ideaSummary: "Invoice financing for MSMEs",
  sector: "fintech",
  stage: "mvp",
  targetCustomer: "MSME manufacturers",
  city: "Bengaluru",
  businessModel: "B2B SaaS",
  fundingNeed: "25l_to_1cr",
  incorporationStatus: "private_limited",
};

export const VAGUE: BusinessProfileDraft = { ideaSummary: "an app for something", city: "Bengaluru" };

export function fakeExtractor(draft: BusinessProfileDraft, inferred: ProfileField[] = ["city"]): ProfileExtractor {
  return { extract: async (): Promise<ExtractedProfile> => ({ draft, inferred }) };
}

export async function makeApp(
  draft: BusinessProfileDraft,
  opts: { rateLimitPerMinute?: number; inferred?: ProfileField[] } = {},
) {
  const confirmed: Session[] = [];
  const deps: ServiceDeps = {
    store: new InMemorySessionStore(),
    extractor: fakeExtractor(draft, opts.inferred),
    maxIdeaChars: 500,
    onConfirm: (s) => confirmed.push(s),
  };
  const app = await buildServer(deps, { rateLimitPerMinute: opts.rateLimitPerMinute ?? 1000 });
  return { app, deps, confirmed };
}

export const IDEA_TEXT = "We are building invoice financing software for small manufacturers.";
