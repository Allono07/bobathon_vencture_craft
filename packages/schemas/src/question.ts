import { z } from "zod";
import { ProfileFieldSchema } from "./profile.js";

export const QuestionSchema = z
  .strictObject({
    id: z.string().min(1),
    field: ProfileFieldSchema,
    question: z.string().min(1).max(300),
    type: z.enum(["single_select", "multi_select", "text"]),
    options: z.array(z.string().min(1)).min(2).max(12).optional(),
    whyWeAsk: z.string().min(1).max(300),
    required: z.boolean(),
  })
  .refine((q) => (q.type === "text") === (q.options === undefined), {
    message: "select questions need options; text questions must not have them",
    path: ["options"],
  });
export type Question = z.infer<typeof QuestionSchema>;

/** A skipped answer is `null`; the server turns it into an Assumption. */
export const AnswerSchema = z.strictObject({
  questionId: z.string().min(1),
  value: z.union([z.string().trim().min(1).max(500), z.array(z.string().max(200)).max(12), z.null()]),
});
export type Answer = z.infer<typeof AnswerSchema>;
export const AnswersRequestSchema = z.strictObject({ answers: z.array(AnswerSchema).max(10) });
