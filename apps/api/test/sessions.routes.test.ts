import { describe, expect, it } from "vitest";
import { COMPLETE, IDEA_TEXT, VAGUE, makeApp } from "./helpers.js";

describe("session API", () => {
  it("vague idea -> questions -> all skipped -> assumptions listed -> confirm starts research once", async () => {
    const { app, confirmed } = await makeApp(VAGUE);

    const created = await app.inject({ method: "POST", url: "/api/sessions", payload: { text: IDEA_TEXT } });
    expect(created.statusCode).toBe(201);
    const c = created.json();
    expect(c.status).toBe("needs_clarification");
    expect(c.questions).toHaveLength(5);
    expect(confirmed).toHaveLength(0);

    const round2 = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/answers`, payload: { answers: [] } });
    expect(round2.json().status).toBe("needs_clarification");
    expect(round2.json().questions).toHaveLength(1);

    const ready = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/answers`, payload: { answers: [{ questionId: "q_incorporationStatus", value: null }] } });
    const r = ready.json();
    expect(r.status).toBe("ready_to_confirm");
    expect(r.assumptions).toHaveLength(6);
    expect(confirmed).toHaveLength(0);

    const confirm = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/confirm`, payload: { profile: r.profileDraft } });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().status).toBe("researching");
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]?.profile?.sector).toBe("general technology");

    const again = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/confirm`, payload: { profile: r.profileDraft } });
    expect(again.statusCode).toBe(409);
    expect(confirmed).toHaveLength(1);
  });

  it("complete idea returns no questions and is ready to confirm", async () => {
    const { app } = await makeApp(COMPLETE);
    const res = await app.inject({ method: "POST", url: "/api/sessions", payload: { text: IDEA_TEXT } });
    expect(res.json().status).toBe("ready_to_confirm");
    expect(res.json().questions).toEqual([]);
  });

  it("confirm before ready is 409 and an edited profile drops the matching assumption", async () => {
    const { app } = await makeApp(VAGUE);
    const c = (await app.inject({ method: "POST", url: "/api/sessions", payload: { text: IDEA_TEXT } })).json();
    const early = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/confirm`, payload: { profile: {} } });
    expect(early.statusCode).toBe(409);

    await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/answers`, payload: { answers: [] } });
    const ready = (await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/answers`, payload: { answers: [] } })).json();
    const edited = { ...ready.profileDraft, sector: "logistics" };
    const done = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/confirm`, payload: { profile: edited } });
    expect(done.json().assumptions.map((a: { field: string }) => a.field)).not.toContain("sector");
  });

  it("validates input: bad profile 400, short text 400, unknown session 404, bad id 400", async () => {
    const { app } = await makeApp(COMPLETE);
    const c = (await app.inject({ method: "POST", url: "/api/sessions", payload: { text: IDEA_TEXT } })).json();
    const bad = await app.inject({ method: "POST", url: `/api/sessions/${c.sessionId}/confirm`, payload: { profile: { sector: "x" } } });
    expect(bad.statusCode).toBe(400);
    const short = await app.inject({ method: "POST", url: "/api/sessions", payload: { text: "hi" } });
    expect(short.statusCode).toBe(400);
    const missing = await app.inject({ method: "POST", url: "/api/sessions/7b9a1c1e-6f0e-4b0e-9d2a-0e0e0e0e0e0e/answers", payload: { answers: [] } });
    expect(missing.statusCode).toBe(404);
    const badId = await app.inject({ method: "POST", url: "/api/sessions/nope/answers", payload: { answers: [] } });
    expect(badId.statusCode).toBe(400);
  });

  it("rate-limits per IP", async () => {
    const { app } = await makeApp(COMPLETE, { rateLimitPerMinute: 2 });
    const codes = [];
    for (let i = 0; i < 3; i++) {
      codes.push((await app.inject({ method: "POST", url: "/api/sessions", payload: { text: IDEA_TEXT } })).statusCode);
    }
    expect(codes).toEqual([201, 201, 429]);
  });
});
