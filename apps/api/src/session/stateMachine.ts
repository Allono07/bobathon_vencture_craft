import type { SessionStatus } from "@venturecraft/schemas";
import { StateError } from "../errors.js";

const ALLOWED: Record<SessionStatus, readonly SessionStatus[]> = {
  draft: ["needs_clarification", "ready_to_confirm"],
  needs_clarification: ["needs_clarification", "ready_to_confirm"],
  ready_to_confirm: ["researching"],
  researching: ["done"],
  done: [],
};

/** Returns `to` when the move is legal, otherwise throws StateError. */
export function transition(from: SessionStatus, to: SessionStatus): SessionStatus {
  if (!ALLOWED[from].includes(to)) throw new StateError(`cannot move from ${from} to ${to}`);
  return to;
}
