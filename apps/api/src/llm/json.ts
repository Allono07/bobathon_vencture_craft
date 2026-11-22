/** Pulls the first top-level JSON object out of a model reply (tolerates prose or code fences around it). */
export function parseJsonObject(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}
