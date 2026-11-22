import type { EligibilityResult, FundingProgram } from "@venturecraft/schemas";
import { OFFICIAL_SCHEME_DOMAINS, discoverSchemes } from "../funding/discovery.js";
import { draftApplication, evaluate } from "../funding/eligibility.js";
import { loadPrograms } from "../funding/programs.js";
import { gather } from "../research/pipeline.js";
import { extractLeads } from "./leads.js";
import { leadQueries, schemeQueries } from "./queries.js";
import type { CategoryModule, ModuleContext } from "./types.js";

const ORDER: Record<EligibilityResult["outcome"], number> = { qualifies: 0, partial: 1, does_not_qualify: 2 };

/** Curated programs and government schemes, evaluated deterministically against the confirmed profile. */
export function matchPrograms(programs: readonly FundingProgram[], profile: ModuleContext["profile"]) {
  return programs
    .map((program) => {
      const eligibility = evaluate(program, profile);
      return {
        program,
        eligibility,
        // Credits programs give platform credits, not cash. The UI must label them as such.
        creditsNotCash: program.type === "credits",
        draft: eligibility.outcome === "does_not_qualify" ? undefined : draftApplication(program, profile),
      };
    })
    .sort((a, b) => ORDER[a.eligibility.outcome] - ORDER[b.eligibility.outcome]);
}

export const fundingModule: CategoryModule = {
  category: "funding",
  needs: ["stage", "fundingNeed"],
  async run(ctx) {
    const curated = loadPrograms();
    const matches = matchPrograms(curated, ctx.profile);
    if (ctx.fixtures) return { matches, candidates: [], leads: [], liveDiscovery: false };

    // Live layer: official-domain scheme discovery and Bengaluru leads. Failures here must not hide the curated matches.
    const base = { category: "funding" as const, web: ctx.web, cache: ctx.cache, emit: ctx.emit };
    const [schemeDocs, leadDocs] = await Promise.all([
      gather(base, schemeQueries(ctx.profile), { includeDomains: [...OFFICIAL_SCHEME_DOMAINS], maxPages: 4 }).catch(() => []),
      gather(base, leadQueries(ctx.profile), { maxPages: 4 }).catch(() => []),
    ]);
    const [candidates, leads] = await Promise.all([
      discoverSchemes(ctx.llm, schemeDocs, curated, ctx.now()).catch(() => []),
      extractLeads(ctx.llm, leadDocs, "incubator", ctx.now()).catch(() => []),
    ]);
    return { matches, candidates, candidatesNeedReview: true, leads, liveDiscovery: true };
  },
};
