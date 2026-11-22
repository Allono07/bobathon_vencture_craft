import { z } from "zod";
import type { FastifyInstance } from "fastify";
import type { SessionStore } from "../session/store.js";

const Params = z.strictObject({ id: z.uuid() });

export function registerResultsRoutes(app: FastifyInstance, deps: { store: SessionStore }): void {
  // Non-streaming access to the same outcomes, plus the assumptions the research relied on.
  app.get("/api/sessions/:id/results", async (req) => {
    const { id } = Params.parse(req.params);
    const s = deps.store.get(id);
    return { sessionId: s.id, status: s.status, profile: s.profile, assumptions: s.assumptions, results: s.results };
  });
}
