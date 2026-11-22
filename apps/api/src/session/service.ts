import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { BusinessProfileSchema } from "@venturecraft/schemas";
import type { Answer, BusinessProfile } from "@venturecraft/schemas";
import { mergeAnswers } from "../clarify/answerMerge.js";
import { advance } from "../clarify/engine.js";
import { InputError, StateError } from "../errors.js";
import type { ProfileExtractor } from "../llm/extractProfile.js";
import { computeCompleteness } from "./completeness.js";
import { sanitizeText } from "./sanitize.js";
import { transition } from "./stateMachine.js";
import type { SessionStore } from "./store.js";
import type { Session } from "./types.js";

export interface ServiceDeps {
  store: SessionStore;
  extractor: ProfileExtractor;
  maxIdeaChars: number;
  /** Called exactly once per session, only after a valid confirm. Research starts here. */
  onConfirm: (session: Session) => void;
}

export async function createSession(deps: ServiceDeps, text: unknown): Promise<Session> {
  const clean = sanitizeText(text, deps.maxIdeaChars);
  const { draft, inferred } = await deps.extractor.extract(clean);
  const session = advance({
    id: randomUUID(),
    status: "draft",
    draft,
    inferred,
    assumptions: [],
    askedFields: [],
    round: 0,
    questions: [],
    results: {},
    createdAt: new Date().toISOString(),
  });
  deps.store.save(session);
  return session;
}

export function submitAnswers(deps: ServiceDeps, id: string, answers: readonly Answer[]): Session {
  const session = deps.store.get(id);
  if (session.status !== "needs_clarification") throw new StateError(`session is ${session.status}`);
  const next = advance(mergeAnswers(session, answers));
  deps.store.save(next);
  return next;
}

export function confirmSession(deps: ServiceDeps, id: string, profileInput: unknown): Session {
  const session = deps.store.get(id);
  if (session.status !== "ready_to_confirm") throw new StateError(`session is ${session.status}`);
  let profile: BusinessProfile;
  try {
    profile = BusinessProfileSchema.parse(profileInput);
  } catch (err) {
    if (err instanceof ZodError) throw new InputError("invalid profile");
    throw err;
  }
  const confirmed: Session = {
    ...session,
    profile,
    // An assumption the user edited away no longer applies.
    assumptions: session.assumptions.filter((a) => String(profile[a.field]) === a.assumedValue),
    status: transition(session.status, "researching"),
  };
  deps.store.save(confirmed);
  deps.onConfirm(confirmed);
  return confirmed;
}

export function sessionView(session: Session) {
  return {
    sessionId: session.id,
    status: session.status,
    profileDraft: session.draft,
    completeness: computeCompleteness(session.draft, session.inferred),
    questions: session.questions,
    assumptions: session.assumptions,
  };
}
