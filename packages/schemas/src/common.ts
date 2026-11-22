import { z } from "zod";

export const CATEGORIES = [
  "idea_check",
  "competitors",
  "market_fit",
  "tam_sam_som",
  "funding",
  "legal",
] as const;
export const CategorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof CategorySchema>;

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const UrlSchema = z.url({ protocol: /^https?$/ });
export const IsoDateTimeSchema = z.iso.datetime();
