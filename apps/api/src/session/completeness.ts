import { PROFILE_FIELDS } from "@venturecraft/schemas";
import type { BusinessProfileDraft, Completeness, ProfileField } from "@venturecraft/schemas";

export function computeCompleteness(
  draft: BusinessProfileDraft,
  inferred: readonly ProfileField[],
): Completeness {
  const result = {} as Completeness;
  for (const field of PROFILE_FIELDS) {
    if (draft[field] === undefined) result[field] = "missing";
    else result[field] = inferred.includes(field) ? "inferred" : "known";
  }
  return result;
}
