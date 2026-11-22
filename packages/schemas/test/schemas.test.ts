import { describe, expect, it } from "vitest";
import {
  BusinessProfileDraftSchema,
  BusinessProfileSchema,
  ComplianceItemSchema,
  FundingProgramSchema,
  LeadSchema,
  QuestionSchema,
  TamEstimateSchema,
} from "../src/index.js";

const now = "2026-11-22T00:00:00.000Z";
const lead = {
  name: "Example Incubator",
  type: "incubator",
  url: "https://example.org",
  whyRelevant: "Backs SaaS startups",
  location: "Bengaluru",
  source: "https://example.org/about",
  fetchedAt: now,
  confidence: "medium",
};

describe("profile", () => {
  it("defaults city to Bengaluru", () => {
    expect(BusinessProfileDraftSchema.parse({}).city).toBe("Bengaluru");
  });
  it("rejects unknown fields", () => {
    expect(BusinessProfileDraftSchema.safeParse({ founderName: "x" }).success).toBe(false);
  });
  it("final profile requires the four required fields", () => {
    expect(BusinessProfileSchema.safeParse({ ideaSummary: "x" }).success).toBe(false);
    expect(
      BusinessProfileSchema.safeParse({
        ideaSummary: "x",
        sector: "fintech",
        stage: "idea",
        targetCustomer: "SMEs",
        businessModel: "SaaS",
      }).success,
    ).toBe(true);
  });
});

describe("question", () => {
  const base = { id: "q1", field: "stage", question: "Stage?", whyWeAsk: "Funding fit", required: true };
  it("select needs options", () => {
    expect(QuestionSchema.safeParse({ ...base, type: "single_select" }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...base, type: "single_select", options: ["idea", "mvp"] }).success).toBe(true);
  });
  it("text must not carry options", () => {
    expect(QuestionSchema.safeParse({ ...base, type: "text", options: ["a", "b"] }).success).toBe(false);
  });
});

describe("lead", () => {
  it("accepts an organization", () => expect(LeadSchema.safeParse(lead).success).toBe(true));
  it("rejects personal contact fields", () => {
    expect(LeadSchema.safeParse({ ...lead, contactPublic: { personalEmail: "a@b.com" } }).success).toBe(false);
  });
  it("rejects non-http urls", () => {
    expect(LeadSchema.safeParse({ ...lead, url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("tam", () => {
  const tam = { low: 1, high: 2, currency: "INR", method: "top_down", assumptions: [{ statement: "a" }], sources: [] };
  it("requires assumptions", () => expect(TamEstimateSchema.safeParse({ ...tam, assumptions: [] }).success).toBe(false));
  it("requires low <= high", () => expect(TamEstimateSchema.safeParse({ ...tam, low: 5 }).success).toBe(false));
  it("accepts a valid range", () => expect(TamEstimateSchema.safeParse(tam).success).toBe(true));
});

describe("compliance", () => {
  it("notLegalAdvice must be literal true", () => {
    const item = {
      title: "GST",
      why: "w",
      authority: "GSTN",
      steps: ["s"],
      officialUrl: "https://www.gst.gov.in",
      providers: [],
    };
    expect(ComplianceItemSchema.safeParse({ ...item, notLegalAdvice: true }).success).toBe(true);
    expect(ComplianceItemSchema.safeParse({ ...item, notLegalAdvice: false }).success).toBe(false);
  });
});

describe("funding program", () => {
  const p = {
    id: "x",
    name: "X",
    type: "credits",
    provider: "P",
    eligibility: {},
    benefit: "credits",
    applyUrl: "https://example.org",
    deadline: "rolling",
    status: "unknown",
    sourceUrl: "https://example.org",
    lastVerified: now,
  };
  it("accepts rolling deadline and fills eligibility notes", () => {
    expect(FundingProgramSchema.parse(p).eligibility.notes).toEqual([]);
  });
  it("rejects bad type", () => expect(FundingProgramSchema.safeParse({ ...p, type: "cash" }).success).toBe(false));
});
