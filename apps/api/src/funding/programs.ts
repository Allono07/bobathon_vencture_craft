import { readFileSync } from "node:fs";
import { z } from "zod";
import { FundingProgramSchema } from "@venturecraft/schemas";
import type { FundingProgram } from "@venturecraft/schemas";

const FileSchema = z.strictObject({
  version: z.number().int(),
  reviewedAt: z.iso.date(),
  note: z.string(),
  programs: z.array(FundingProgramSchema).min(1),
});

export function loadPrograms(path: URL = new URL("./programs.v1.json", import.meta.url)): FundingProgram[] {
  const file = FileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const ids = file.programs.map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate program ids in programs file");
  return file.programs;
}
