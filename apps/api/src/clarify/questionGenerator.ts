import { FUNDING_NEEDS, INCORPORATION, REQUIRED_FIELDS, STAGES } from "@venturecraft/schemas";
import type { Completeness, ProfileField, Question } from "@venturecraft/schemas";

export const MAX_QUESTIONS_PER_ROUND = 5;

type Template = Pick<Question, "type" | "question" | "whyWeAsk" | "options">;

/** Ordered by impact on research quality. Only fields listed here are ever asked. */
const TEMPLATES: ReadonlyArray<readonly [ProfileField, Template]> = [
  ["sector", { type: "text", question: "Which sector or industry is this in?", whyWeAsk: "Drives every search: competitors, schemes and market size." }],
  ["stage", { type: "single_select", question: "What stage is the business at?", options: [...STAGES], whyWeAsk: "Most funding programs and schemes are stage-gated." }],
  ["targetCustomer", { type: "text", question: "Who is the target customer?", whyWeAsk: "Defines the audience, market size and competitor set." }],
  ["businessModel", { type: "single_select", question: "How will the business make money?", options: ["B2B SaaS", "B2C app", "Marketplace", "D2C products", "Services or consulting", "Hardware", "Other"], whyWeAsk: "Changes the competitor set and the right legal entity." }],
  ["fundingNeed", { type: "single_select", question: "How much funding do you need?", options: [...FUNDING_NEEDS], whyWeAsk: "Filters grants, schemes, angels and VCs by ticket size." }],
  ["incorporationStatus", { type: "single_select", question: "Is the business incorporated, and as what?", options: [...INCORPORATION], whyWeAsk: "Many schemes require a registered entity; also drives compliance advice." }],
];

interface Input {
  completeness: Completeness;
  askedFields: readonly ProfileField[];
}

/** Asks only about fields that are missing (not inferred) and not asked before. */
export function generateQuestions({ completeness, askedFields }: Input): Question[] {
  return TEMPLATES.filter(([field]) => completeness[field] === "missing" && !askedFields.includes(field))
    .slice(0, MAX_QUESTIONS_PER_ROUND)
    .map(([field, template]) => ({
      id: `q_${field}`,
      field,
      ...template,
      required: (REQUIRED_FIELDS as readonly ProfileField[]).includes(field),
    }));
}
