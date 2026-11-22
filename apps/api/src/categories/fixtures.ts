import type { Category } from "@venturecraft/schemas";

const FETCHED_AT = "2026-01-01T00:00:00.000Z";
const SRC = "https://example.com/sample-source";

/**
 * Clearly labelled SAMPLE data for building the frontend without spending TinyFish credits.
 * Names are fictional and every URL is example.com. None of it is a real finding.
 */
export const FIXTURE_RESULTS: Partial<Record<Category, Record<string, unknown>>> = {
  competitors: {
    items: [
      { name: "Sample Competitor India", url: SRC, region: "india", offering: "Sample offering (fixture)", positioning: "Sample positioning (fixture)", strengths: ["Sample strength"], weaknesses: ["Sample weakness"], source: SRC, fetchedAt: FETCHED_AT },
      { name: "Sample Competitor Global", url: SRC, region: "global", offering: "Sample offering (fixture)", positioning: "Sample positioning (fixture)", strengths: ["Sample strength"], weaknesses: ["Sample weakness"], source: SRC, fetchedAt: FETCHED_AT },
    ],
    notFound: false,
  },
  idea_check: {
    verdict: "emerging",
    similar: [{ name: "Sample Similar Product", url: SRC, similarity: 0.6, evidence: "Sample evidence (fixture)", fetchedAt: FETCHED_AT }],
    evidence: [{ claim: "Sample evidence (fixture)", source: SRC }],
    notFound: false,
  },
  market_fit: {
    items: [{ kind: "audience_segment", statement: "Sample audience segment (fixture)", source: SRC, fetchedAt: FETCHED_AT }],
    notFound: false,
  },
  tam_sam_som: {
    tam: { low: 1_000_000_000, high: 2_000_000_000, currency: "INR", method: "top_down", assumptions: [{ statement: "Sample assumption (fixture)" }], sources: [SRC] },
    notFound: false,
  },
  legal: {
    entityRecommendation: { recommended: "private_limited", reasoning: ["Sample reasoning (fixture)"], notLegalAdvice: true },
    items: [{ title: "Sample registration (fixture)", why: "Sample", authority: "Sample authority", steps: ["Sample step"], officialUrl: SRC, providers: [], notLegalAdvice: true }],
    notFound: false,
  },
};
