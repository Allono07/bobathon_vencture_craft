import { z } from "zod";
import { IsoDateTimeSchema, UrlSchema } from "./common.js";

export const MarketFitItemSchema = z.strictObject({
  kind: z.enum(["audience_segment", "demand_signal"]),
  statement: z.string().min(1).max(500),
  source: UrlSchema,
  fetchedAt: IsoDateTimeSchema,
});
export type MarketFitItem = z.infer<typeof MarketFitItemSchema>;
