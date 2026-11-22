import { createHash } from "node:crypto";
import type { FundingProgram } from "@venturecraft/schemas";
import type { WebResearch } from "../tinyfish/types.js";

export interface ChangeFlag {
  programId: string;
  kind: "content_changed" | "first_seen" | "fetch_failed";
  sourceUrl: string;
  previousHash?: string;
  newHash?: string;
  checkedAt: string;
}

export interface RefreshOutcome {
  flags: ChangeFlag[];
  /** Latest content hashes per program id, to be stored by the caller for the next run. */
  hashes: Record<string, string>;
}

const normalize = (text: string): string => text.replace(/\s+/g, " ").trim();
const hash = (text: string): string => createHash("sha256").update(normalize(text)).digest("hex");

/**
 * Re-reads each program's official page and FLAGS changes for human review.
 * It never edits the programs file or any program field.
 */
export async function refreshPrograms(
  programs: readonly FundingProgram[],
  web: WebResearch,
  previous: Readonly<Record<string, string>>,
  now: () => Date = () => new Date(),
): Promise<RefreshOutcome> {
  const flags: ChangeFlag[] = [];
  const hashes: Record<string, string> = { ...previous };
  const checkedAt = now().toISOString();

  for (const program of programs) {
    const base = { programId: program.id, sourceUrl: program.sourceUrl, checkedAt };
    try {
      const [page] = await web.fetchPages([program.sourceUrl]);
      if (!page) {
        flags.push({ ...base, kind: "fetch_failed" });
        continue;
      }
      const newHash = hash(page.text);
      const previousHash = previous[program.id];
      if (!previousHash) flags.push({ ...base, kind: "first_seen", newHash });
      else if (previousHash !== newHash) flags.push({ ...base, kind: "content_changed", previousHash, newHash });
      hashes[program.id] = newHash;
    } catch {
      flags.push({ ...base, kind: "fetch_failed" });
    }
  }
  return { flags, hashes };
}
