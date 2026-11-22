import type { BusinessProfile, EligibilityResult, FundingProgram } from "@venturecraft/schemas";

/**
 * Deterministic eligibility check against the structured rules in the data file.
 * "qualifies" = every rule we can evaluate passes and nothing is unknown;
 * "partial" = nothing fails but some facts are not in the profile (listed under missing);
 * "does_not_qualify" = a rule we can evaluate fails.
 * Free-text `notes` are shown to the user and are not evaluated.
 */
export function evaluate(program: FundingProgram, profile: BusinessProfile): EligibilityResult {
  const e = program.eligibility;
  const qualifiesBecause: string[] = [];
  const unknown: string[] = [];
  const fails: string[] = [];

  if (e.stages) {
    if (e.stages.includes(profile.stage)) qualifiesBecause.push(`Your stage (${profile.stage}) is accepted`);
    else fails.push(`Accepted stages: ${e.stages.join(", ")}; yours is ${profile.stage}`);
  }
  if (e.incorporation) {
    if (!profile.incorporationStatus) unknown.push("Your incorporation status");
    else if (e.incorporation.includes(profile.incorporationStatus)) qualifiesBecause.push(`Your entity type (${profile.incorporationStatus}) is accepted`);
    else fails.push(`Accepted entity types: ${e.incorporation.join(", ")}; yours is ${profile.incorporationStatus}`);
  }
  if (e.sectors) {
    const haystack = `${profile.sector} ${profile.ideaSummary}`.toLowerCase();
    if (e.sectors.some((s) => haystack.includes(s.toLowerCase()))) qualifiesBecause.push("Your sector matches the programme focus");
    else fails.push(`Programme focus: ${e.sectors.join(", ")}; your sector is ${profile.sector}`);
  }
  if (e.cities) {
    if (e.cities.some((c) => c.toLowerCase() === profile.city.toLowerCase())) qualifiesBecause.push(`Your location (${profile.city}) is covered`);
    else fails.push(`Covers: ${e.cities.join(", ")}; you are in ${profile.city}`);
  }
  if (e.fundingNeeds) {
    if (!profile.fundingNeed) unknown.push("How much funding you need");
    else if (e.fundingNeeds.includes(profile.fundingNeed)) qualifiesBecause.push("The funding amount you need fits");
    else fails.push(`Fits funding needs: ${e.fundingNeeds.join(", ")}; yours is ${profile.fundingNeed}`);
  }
  if (e.requiresDpiit) unknown.push("DPIIT recognition (not captured in your profile; confirm you hold it)");
  if (e.maxCompanyAgeYears) unknown.push(`Company age of at most ${e.maxCompanyAgeYears} years (not captured in your profile; confirm)`);

  const missing = [...fails.map((f) => `Does not meet: ${f}`), ...unknown.map((u) => `Confirm: ${u}`)];
  const outcome = fails.length > 0 ? "does_not_qualify" : unknown.length > 0 ? "partial" : "qualifies";
  const unverified = program.status === "unknown" ? " Status and deadline are not verified, so check the official page first." : "";
  const nextStep =
    program.status === "closed"
      ? `Applications are marked closed. Watch the official page for the next call: ${program.applyUrl}`
      : outcome === "does_not_qualify"
        ? `Not a fit right now. ${fails[0]}.`
        : outcome === "partial"
          ? `Confirm the open points, then read the official page: ${program.applyUrl}.${unverified}`
          : `Read the official eligibility and apply: ${program.applyUrl}.${unverified}`;

  return { programId: program.id, qualifiesBecause, missing, nextStep, outcome };
}

/** A DRAFT for the founder to edit. The system never submits or sends anything. */
export function draftApplication(program: FundingProgram, profile: BusinessProfile): string {
  return [
    `[DRAFT, review and edit before use. Not sent anywhere.]`,
    `To: ${program.provider}`,
    `Subject: Application / enquiry: ${program.name}`,
    ``,
    `Hello,`,
    `We are a ${profile.stage.replace("_", " ")} stage ${profile.sector} startup in ${profile.city}.`,
    `${profile.ideaSummary}`,
    `Our target customers are ${profile.targetCustomer}, and our business model is ${profile.businessModel}.`,
    `We would like to apply for ${program.name} and understand the next steps. Official page: ${program.applyUrl}`,
    ``,
    `Thank you.`,
  ].join("\n");
}
