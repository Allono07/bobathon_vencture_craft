import type {
  Assumption,
  BusinessProfile,
  BusinessProfileDraft,
  Category,
  ProfileField,
  Question,
  SessionStatus,
} from "@venturecraft/schemas";

export interface Session {
  id: string;
  status: SessionStatus;
  draft: BusinessProfileDraft;
  /** Fields the LLM inferred rather than the user stating them. */
  inferred: ProfileField[];
  assumptions: Assumption[];
  /** Fields already asked about; never asked twice. */
  askedFields: ProfileField[];
  /** Number of clarification rounds issued so far (max 2). */
  round: number;
  questions: Question[];
  profile?: BusinessProfile;
  /** Per-category outcome, filled as research finishes. */
  results: Partial<Record<Category, CategoryOutcome>>;
  createdAt: string;
}

export type CategoryOutcome =
  | { status: "done"; data: Record<string, unknown> }
  | { status: "failed"; reason: string }
  | { status: "insufficient_profile"; missingFields: string[] };
