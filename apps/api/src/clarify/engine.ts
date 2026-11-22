import { REQUIRED_FIELDS } from "@venturecraft/schemas";
import { computeCompleteness } from "../session/completeness.js";
import { transition } from "../session/stateMachine.js";
import type { Session } from "../session/types.js";
import { assume } from "./assumptions.js";
import { generateQuestions } from "./questionGenerator.js";

export const MAX_ROUNDS = 2;

/**
 * Re-evaluates a session: issues the next clarification round if one is allowed and
 * useful, otherwise fills still-missing required fields with assumptions and moves to
 * ready_to_confirm. Funding and Legal fields left missing stay missing: those modules
 * report insufficient_profile instead of guessing.
 */
export function advance(session: Session): Session {
  const completeness = computeCompleteness(session.draft, session.inferred);

  if (session.round < MAX_ROUNDS) {
    const questions = generateQuestions({ completeness, askedFields: session.askedFields });
    if (questions.length > 0) {
      return {
        ...session,
        status: transition(session.status, "needs_clarification"),
        questions,
        round: session.round + 1,
        askedFields: [...session.askedFields, ...questions.map((q) => q.field)],
      };
    }
  }

  let { draft, assumptions } = session;
  for (const field of REQUIRED_FIELDS) {
    if (completeness[field] === "missing") ({ draft, assumptions } = assume(draft, assumptions, field, "default"));
  }
  return {
    ...session,
    draft,
    assumptions,
    questions: [],
    status: transition(session.status, "ready_to_confirm"),
  };
}
