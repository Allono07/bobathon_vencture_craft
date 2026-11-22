import { z } from "zod";

export const STAGES = ["idea", "prototype", "mvp", "early_revenue", "growth"] as const;
export const INCORPORATION = [
  "not_incorporated",
  "private_limited",
  "llp",
  "opc",
  "partnership",
  "proprietorship",
  "other",
] as const;
export const FUNDING_NEEDS = ["none", "under_25l", "25l_to_1cr", "1cr_to_10cr", "over_10cr"] as const;

export const StageSchema = z.enum(STAGES);
export const IncorporationSchema = z.enum(INCORPORATION);
export const FundingNeedSchema = z.enum(FUNDING_NEEDS);

const text = z.string().trim().min(1).max(500);

export const BusinessProfileDraftSchema = z.strictObject({
  ideaSummary: text.optional(),
  sector: text.optional(),
  stage: StageSchema.optional(),
  targetCustomer: text.optional(),
  city: text.default("Bengaluru"),
  businessModel: text.optional(),
  fundingNeed: FundingNeedSchema.optional(),
  incorporationStatus: IncorporationSchema.optional(),
  teamSize: z.number().int().min(1).max(100000).optional(),
  bootstrapped: z.boolean().optional(),
});
export type BusinessProfileDraft = z.infer<typeof BusinessProfileDraftSchema>;

export const PROFILE_FIELDS = [
  "ideaSummary",
  "sector",
  "stage",
  "targetCustomer",
  "city",
  "businessModel",
  "fundingNeed",
  "incorporationStatus",
  "teamSize",
  "bootstrapped",
] as const satisfies readonly (keyof BusinessProfileDraft)[];
export const ProfileFieldSchema = z.enum(PROFILE_FIELDS);
export type ProfileField = z.infer<typeof ProfileFieldSchema>;

/** Fields that must be known (or explicitly assumed) before research may start. */
export const REQUIRED_FIELDS = [
  "sector",
  "stage",
  "targetCustomer",
  "businessModel",
] as const satisfies readonly ProfileField[];

export const BusinessProfileSchema = BusinessProfileDraftSchema.extend({
  ideaSummary: text,
  sector: text,
  stage: StageSchema,
  targetCustomer: text,
  businessModel: text,
});
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;

export const FieldStatusSchema = z.enum(["known", "inferred", "missing"]);
export type FieldStatus = z.infer<typeof FieldStatusSchema>;
export const CompletenessSchema = z.record(ProfileFieldSchema, FieldStatusSchema);
export type Completeness = z.infer<typeof CompletenessSchema>;

export const SESSION_STATUSES = [
  "draft",
  "needs_clarification",
  "ready_to_confirm",
  "researching",
  "done",
] as const;
export const SessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
