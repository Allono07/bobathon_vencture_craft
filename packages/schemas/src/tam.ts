import { z } from "zod";
import { UrlSchema } from "./common.js";

const Assumption = z.strictObject({
  statement: z.string().min(1).max(300),
  value: z.string().max(100).optional(),
});

export const TamEstimateSchema = z
  .strictObject({
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
    currency: z.string().length(3),
    method: z.enum(["top_down", "bottom_up"]),
    assumptions: z.array(Assumption).min(1),
    sources: z.array(UrlSchema),
  })
  .refine((t) => t.low <= t.high, { message: "low must be <= high", path: ["low"] });
export type TamEstimate = z.infer<typeof TamEstimateSchema>;
