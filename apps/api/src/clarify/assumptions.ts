import { BusinessProfileDraftSchema } from "@venturecraft/schemas";
import type { Assumption, BusinessProfileDraft, ProfileField } from "@venturecraft/schemas";

/** Conservative placeholders used when a field is skipped. Always surfaced to the user as an Assumption. */
const DEFAULTS: Partial<Record<ProfileField, { value: string; note: string }>> = {
  sector: { value: "general technology", note: "Sector not provided; searches use a broad technology scope." },
  stage: { value: "idea", note: "Stage not provided; assumed earliest stage." },
  targetCustomer: { value: "small businesses and consumers in India", note: "Target customer not provided." },
  businessModel: { value: "subscription software", note: "Business model not provided." },
  fundingNeed: { value: "under_25l", note: "Funding need not provided; assumed a small early-stage amount." },
  incorporationStatus: { value: "not_incorporated", note: "Incorporation status not provided." },
};

export function setField(draft: BusinessProfileDraft, field: ProfileField, value: unknown): BusinessProfileDraft {
  return BusinessProfileDraftSchema.parse({ ...draft, [field]: value });
}

export function hasDefault(field: ProfileField): boolean {
  return DEFAULTS[field] !== undefined;
}

/** Fills `field` with its default and records the Assumption, replacing any earlier one for that field. */
export function assume(
  draft: BusinessProfileDraft,
  assumptions: readonly Assumption[],
  field: ProfileField,
  reason: Assumption["reason"],
): { draft: BusinessProfileDraft; assumptions: Assumption[] } {
  const def = DEFAULTS[field];
  if (!def) throw new Error(`no default for ${field}`);
  return {
    draft: setField(draft, field, def.value),
    assumptions: [
      ...assumptions.filter((a) => a.field !== field),
      { field, assumedValue: def.value, reason, note: def.note },
    ],
  };
}
