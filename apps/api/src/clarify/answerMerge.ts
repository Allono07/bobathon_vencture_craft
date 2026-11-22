import { ZodError } from "zod";
import type { Answer } from "@venturecraft/schemas";
import { InputError } from "../errors.js";
import type { Session } from "../session/types.js";
import { assume, hasDefault, setField } from "./assumptions.js";

/**
 * Merges answers into the session. A null or omitted answer is a skip and becomes an
 * explicit Assumption. Unknown or duplicate question ids are rejected.
 */
export function mergeAnswers(session: Session, answers: readonly Answer[]): Session {
  const pending = new Map(session.questions.map((q) => [q.id, q]));
  const given = new Map<string, Answer["value"]>();
  for (const a of answers) {
    if (!pending.has(a.questionId)) throw new InputError(`unknown question: ${a.questionId}`);
    if (given.has(a.questionId)) throw new InputError(`duplicate answer: ${a.questionId}`);
    given.set(a.questionId, a.value);
  }

  let draft = session.draft;
  let assumptions = session.assumptions;
  for (const q of session.questions) {
    let value = given.get(q.id) ?? null;
    if (value === null) {
      if (!hasDefault(q.field)) continue;
      ({ draft, assumptions } = assume(draft, assumptions, q.field, "skipped_by_user"));
      continue;
    }
    if (Array.isArray(value)) {
      if (q.type !== "multi_select") throw new InputError(`${q.field} takes a single value`);
      value = value.join(", ");
    }
    if (q.type !== "text" && q.options && !q.options.includes(value)) {
      throw new InputError(`invalid option for ${q.field}`);
    }
    try {
      draft = setField(draft, q.field, value);
    } catch (err) {
      if (err instanceof ZodError) throw new InputError(`invalid value for ${q.field}`);
      throw err;
    }
    assumptions = assumptions.filter((a) => a.field !== q.field);
  }

  const answeredFields = new Set(session.questions.map((q) => q.field));
  return {
    ...session,
    draft,
    assumptions,
    inferred: session.inferred.filter((f) => !answeredFields.has(f)),
    questions: [],
  };
}
