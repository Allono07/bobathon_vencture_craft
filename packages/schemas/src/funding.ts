import { z } from "zod";
import { IsoDateTimeSchema, UrlSchema } from "./common.js";
import { FundingNeedSchema, IncorporationSchema, StageSchema } from "./profile.js";

/** Evaluated by deterministic rules; an omitted key means "no constraint". */
export const EligibilitySchema = z.strictObject({
  stages: z.array(StageSchema).optional(),
  incorporation: z.array(IncorporationSchema).optional(),
  sectors: z.array(z.string().min(1)).optional(),
  cities: z.array(z.string().min(1)).optional(),
  fundingNeeds: z.array(FundingNeedSchema).optional(),
  requiresDpiit: z.boolean().optional(),
  maxCompanyAgeYears: z.number().positive().optional(),
  notes: z.array(z.string().max(300)).default([]),
});
export type Eligibility = z.infer<typeof EligibilitySchema>;

export const FundingProgramSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(200),
  type: z.enum(["grant", "credits", "accelerator", "angel-network", "vc", "govt-scheme"]),
  provider: z.string().min(1).max(200),
  eligibility: EligibilitySchema,
  benefit: z.string().min(1).max(500),
  applyUrl: UrlSchema,
  // "unknown" is used when no official page states a deadline (never guessed).
  deadline: z.union([z.iso.date(), z.literal("rolling"), z.literal("unknown")]),
  status: z.enum(["open", "closed", "unknown"]),
  sourceUrl: UrlSchema,
  lastVerified: IsoDateTimeSchema,
});
export type FundingProgram = z.infer<typeof FundingProgramSchema>;

export const EligibilityResultSchema = z.strictObject({
  programId: z.string(),
  qualifiesBecause: z.array(z.string()),
  missing: z.array(z.string()),
  nextStep: z.string(),
  outcome: z.enum(["qualifies", "partial", "does_not_qualify"]),
});
export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;
