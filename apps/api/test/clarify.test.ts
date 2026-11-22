import { describe, expect, it } from "vitest";
import { mergeAnswers } from "../src/clarify/answerMerge.js";
import { advance } from "../src/clarify/engine.js";
import { generateQuestions } from "../src/clarify/questionGenerator.js";
import { InputError } from "../src/errors.js";
import { computeCompleteness } from "../src/session/completeness.js";
import { transition } from "../src/session/stateMachine.js";
import type { Session } from "../src/session/types.js";
import { COMPLETE, VAGUE } from "./helpers.js";

const base = (draft: Session["draft"], inferred: Session["inferred"] = ["city"]): Session => ({
  id: "s",
  status: "draft",
  draft,
  inferred,
  assumptions: [],
  askedFields: [],
  round: 0,
  questions: [],
  results: {},
  createdAt: "2026-11-22T00:00:00.000Z",
});

describe("completeness", () => {
  it("labels known, inferred and missing", () => {
    const c = computeCompleteness({ ...VAGUE, sector: "x" }, ["sector", "city"]);
    expect(c.sector).toBe("inferred");
    expect(c.city).toBe("inferred");
    expect(c.ideaSummary).toBe("known");
    expect(c.stage).toBe("missing");
  });
});

describe("question generation", () => {
  it("vague idea yields at most 5 questions ordered by impact, required first", () => {
    const qs = generateQuestions({ completeness: computeCompleteness(VAGUE, ["city"]), askedFields: [] });
    expect(qs).toHaveLength(5);
    expect(qs.map((q) => q.field)).toEqual(["sector", "stage", "targetCustomer", "businessModel", "fundingNeed"]);
    expect(qs.slice(0, 4).every((q) => q.required)).toBe(true);
    expect(qs[4]?.required).toBe(false);
  });
  it("complete idea yields none", () => {
    expect(generateQuestions({ completeness: computeCompleteness(COMPLETE, ["city"]), askedFields: [] })).toEqual([]);
  });
  it("does not ask about inferred fields or fields already asked", () => {
    const completeness = computeCompleteness({ ...VAGUE, sector: "fintech" }, ["sector", "city"]);
    const qs = generateQuestions({ completeness, askedFields: ["stage"] });
    expect(qs.map((q) => q.field)).not.toContain("sector");
    expect(qs.map((q) => q.field)).not.toContain("stage");
  });
});

describe("engine and answer merging", () => {
  it("complete idea goes straight to ready_to_confirm", () => {
    const s = advance(base(COMPLETE));
    expect(s.status).toBe("ready_to_confirm");
    expect(s.assumptions).toEqual([]);
  });

  it("answers fill the draft and drop inferred flags", () => {
    let s = advance(base(VAGUE));
    expect(s.status).toBe("needs_clarification");
    s = mergeAnswers(s, [
      { questionId: "q_sector", value: "fintech" },
      { questionId: "q_stage", value: "mvp" },
      { questionId: "q_targetCustomer", value: "MSMEs" },
      { questionId: "q_businessModel", value: "B2B SaaS" },
      { questionId: "q_fundingNeed", value: "none" },
    ]);
    expect(s.draft.sector).toBe("fintech");
    expect(s.draft.stage).toBe("mvp");
    expect(s.assumptions).toEqual([]);
  });

  it("skipping every question yields assumptions, a second round, then ready_to_confirm", () => {
    let s = advance(base(VAGUE));
    s = advance(mergeAnswers(s, []));
    expect(s.status).toBe("needs_clarification");
    expect(s.round).toBe(2);
    expect(s.questions.map((q) => q.field)).toEqual(["incorporationStatus"]);
    s = advance(mergeAnswers(s, [{ questionId: "q_incorporationStatus", value: null }]));
    expect(s.status).toBe("ready_to_confirm");
    expect(s.assumptions.map((a) => a.field).sort()).toEqual(
      ["businessModel", "fundingNeed", "incorporationStatus", "sector", "stage", "targetCustomer"].sort(),
    );
    expect(s.assumptions.every((a) => a.reason === "skipped_by_user")).toBe(true);
    expect(s.draft.stage).toBe("idea");
  });

  it("rejects unknown ids, duplicates and invalid options", () => {
    const s = advance(base(VAGUE));
    expect(() => mergeAnswers(s, [{ questionId: "q_nope", value: "x" }])).toThrow(InputError);
    expect(() =>
      mergeAnswers(s, [{ questionId: "q_sector", value: "a" }, { questionId: "q_sector", value: "b" }]),
    ).toThrow(InputError);
    expect(() => mergeAnswers(s, [{ questionId: "q_stage", value: "unicorn" }])).toThrow(InputError);
  });
});

describe("state machine", () => {
  it("allows the documented path and rejects shortcuts", () => {
    expect(transition("draft", "needs_clarification")).toBe("needs_clarification");
    expect(transition("ready_to_confirm", "researching")).toBe("researching");
    expect(() => transition("draft", "researching")).toThrow();
    expect(() => transition("needs_clarification", "researching")).toThrow();
    expect(() => transition("done", "draft")).toThrow();
  });
});
