import { z } from "zod";
import { IsoDateTimeSchema, UrlSchema } from "./common.js";

export const CompetitorSchema = z.strictObject({
  name: z.string().min(1).max(200),
  url: UrlSchema,
  region: z.enum(["india", "global"]),
  offering: z.string().min(1).max(500),
  pricing: z.string().max(300).optional(),
  positioning: z.string().min(1).max(500),
  strengths: z.array(z.string().min(1).max(200)).max(8),
  weaknesses: z.array(z.string().min(1).max(200)).max(8),
  source: UrlSchema,
  fetchedAt: IsoDateTimeSchema,
});
export type Competitor = z.infer<typeof CompetitorSchema>;

export const IdeaCheckSchema = z.strictObject({
  verdict: z.enum(["crowded", "emerging", "open"]),
  similar: z
    .array(
      z.strictObject({
        name: z.string().min(1),
        url: UrlSchema,
        similarity: z.number().min(0).max(1),
        evidence: z.string().min(1).max(500),
        fetchedAt: IsoDateTimeSchema,
      }),
    )
    .max(15),
  evidence: z.array(z.strictObject({ claim: z.string().min(1), source: UrlSchema })),
});
export type IdeaCheck = z.infer<typeof IdeaCheckSchema>;
