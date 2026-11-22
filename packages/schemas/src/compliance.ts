import { z } from "zod";
import { UrlSchema } from "./common.js";
import { LeadSchema } from "./lead.js";

export const ComplianceItemSchema = z.strictObject({
  title: z.string().min(1).max(200),
  why: z.string().min(1).max(500),
  authority: z.string().min(1).max(200),
  steps: z.array(z.string().min(1).max(300)).min(1),
  estCost: z.string().max(200).optional(),
  officialUrl: UrlSchema,
  providers: z.array(LeadSchema),
  notLegalAdvice: z.literal(true),
});
export type ComplianceItem = z.infer<typeof ComplianceItemSchema>;
