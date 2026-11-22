import { z } from "zod";
import { ConfidenceSchema, IsoDateTimeSchema, UrlSchema } from "./common.js";

/** Public BUSINESS contact only. No personal names, personal emails or phones. */
export const PublicContactSchema = z.strictObject({
  businessEmail: z.email().optional(),
  businessPhone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
});

/** Organizations and programs only. */
export const LeadSchema = z.strictObject({
  name: z.string().min(1).max(200),
  type: z.enum([
    "incubator",
    "accelerator",
    "angel_network",
    "vc",
    "govt_body",
    "service_provider",
    "program",
    "other",
  ]),
  url: UrlSchema,
  whyRelevant: z.string().min(1).max(500),
  location: z.string().min(1).max(200),
  contactPublic: PublicContactSchema.optional(),
  stage: z.string().max(100).optional(),
  ticketSize: z.string().max(100).optional(),
  source: UrlSchema,
  fetchedAt: IsoDateTimeSchema,
  confidence: ConfidenceSchema,
});
export type Lead = z.infer<typeof LeadSchema>;
