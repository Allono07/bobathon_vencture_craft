import { z } from "zod";
import { ProfileFieldSchema } from "./profile.js";

export const AssumptionSchema = z.strictObject({
  field: ProfileFieldSchema,
  assumedValue: z.string().min(1).max(500),
  reason: z.enum(["skipped_by_user", "default", "inferred_by_system"]),
  note: z.string().max(300).optional(),
});
export type Assumption = z.infer<typeof AssumptionSchema>;
