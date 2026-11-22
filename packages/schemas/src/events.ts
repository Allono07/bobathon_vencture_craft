import { z } from "zod";
import { CategorySchema } from "./common.js";

export const CategoryEventSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("queued"), category: CategorySchema }),
  z.strictObject({ type: z.literal("searching"), category: CategorySchema, query: z.string() }),
  z.strictObject({ type: z.literal("reading"), category: CategorySchema, url: z.string() }),
  z.strictObject({ type: z.literal("done"), category: CategorySchema, result: z.unknown() }),
  z.strictObject({ type: z.literal("failed"), category: CategorySchema, reason: z.string() }),
  z.strictObject({
    type: z.literal("insufficient_profile"),
    category: CategorySchema,
    missingFields: z.array(z.string()),
  }),
]);
export type CategoryEvent = z.infer<typeof CategoryEventSchema>;

export const SessionDoneEventSchema = z.strictObject({
  type: z.literal("session_done"),
  failedCategories: z.array(CategorySchema),
});
export type SessionDoneEvent = z.infer<typeof SessionDoneEventSchema>;
export type StreamEvent = CategoryEvent | SessionDoneEvent;
