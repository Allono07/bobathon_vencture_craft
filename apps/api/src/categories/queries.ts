import type { BusinessProfile } from "@venturecraft/schemas";

const MAX_QUERY_CHARS = 150;
const clip = (s: string): string => s.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_CHARS);
const unique = (qs: string[]): string[] => [...new Set(qs.map(clip))];

/** Every query is derived from the confirmed profile, so different answers give different queries. */
export function competitorQueries(p: BusinessProfile): string[] {
  return unique([
    `${p.sector} ${p.businessModel} startups India`,
    `${p.sector} for ${p.targetCustomer} India alternatives competitors`,
    `best ${p.sector} ${p.businessModel} companies ${p.city}`,
    `${p.sector} ${p.businessModel} leading global companies`,
  ]);
}

export function ideaCheckQueries(p: BusinessProfile): string[] {
  return unique([
    `${p.ideaSummary} existing product`,
    `${p.sector} ${p.targetCustomer} existing solutions India`,
    `${p.ideaSummary} similar startup`,
  ]);
}

export function marketFitQueries(p: BusinessProfile): string[] {
  return unique([
    `${p.targetCustomer} India ${p.sector} demand survey`,
    `${p.sector} India customer segments adoption trends`,
    `${p.targetCustomer} ${p.city} ${p.sector} needs`,
  ]);
}

export function tamQueries(p: BusinessProfile): string[] {
  return unique([
    `${p.sector} market size India`,
    `${p.sector} ${p.businessModel} market size India crore`,
    `number of ${p.targetCustomer} in India`,
    `${p.sector} ${p.targetCustomer} average pricing per year India`,
  ]);
}

export function legalQueries(p: BusinessProfile): string[] {
  const entity = p.incorporationStatus && p.incorporationStatus !== "not_incorporated" ? p.incorporationStatus.replace("_", " ") : "private limited company";
  return unique([
    `how to register ${entity} India startup MCA steps`,
    `GST registration startup India official`,
    `Karnataka shops and establishments registration startup ${p.city}`,
    `${p.sector} India licence registration requirements startup`,
  ]);
}

export function providerQueries(p: BusinessProfile): string[] {
  return unique([`company secretary chartered accountant startup registration ${p.city}`]);
}

export function schemeQueries(p: BusinessProfile): string[] {
  return unique([
    `${p.sector} startup grant scheme Karnataka India`,
    `central government startup funding scheme India ${p.stage}`,
  ]);
}

export function leadQueries(p: BusinessProfile): string[] {
  return unique([`incubators accelerators angel networks ${p.city} ${p.sector} startups`]);
}
