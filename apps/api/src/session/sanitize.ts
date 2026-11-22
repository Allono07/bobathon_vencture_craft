import { InputError } from "../errors.js";

const MIN_CHARS = 10;
// C0/C1 control chars except \n and \t, plus zero-width and bidi override characters.
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/g;

export function sanitizeText(input: unknown, maxChars: number): string {
  if (typeof input !== "string") throw new InputError("text must be a string");
  const cleaned = input
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length < MIN_CHARS) throw new InputError(`text must be at least ${MIN_CHARS} characters`);
  if (cleaned.length > maxChars) throw new InputError(`text must be at most ${maxChars} characters`);
  return cleaned;
}

/**
 * Wraps untrusted content for an LLM prompt. Every "<" is replaced so the content
 * cannot close the wrapper or open a fake one.
 */
export function wrapUntrusted(label: string, text: string): string {
  return `<untrusted_${label}>\n${text.replaceAll("<", "＜")}\n</untrusted_${label}>`;
}
