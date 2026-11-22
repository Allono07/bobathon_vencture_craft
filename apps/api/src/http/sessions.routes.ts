import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { AnswersRequestSchema } from "@venturecraft/schemas";
import { confirmSession, createSession, sessionView, submitAnswers } from "../session/service.js";
import type { ServiceDeps } from "../session/service.js";

const CreateBody = z.strictObject({ text: z.string() });
const ConfirmBody = z.strictObject({ profile: z.unknown() });
const Params = z.strictObject({ id: z.uuid() });

export function registerSessionRoutes(app: FastifyInstance, deps: ServiceDeps): void {
  app.post("/api/sessions", async (req, reply) => {
    const { text } = CreateBody.parse(req.body);
    const session = await createSession(deps, text);
    req.log.info({ sessionId: session.id, status: session.status }, "session created");
    return reply.code(201).send(sessionView(session));
  });

  app.post("/api/sessions/:id/answers", async (req) => {
    const { id } = Params.parse(req.params);
    const { answers } = AnswersRequestSchema.parse(req.body);
    const session = submitAnswers(deps, id, answers);
    req.log.info({ sessionId: id, status: session.status }, "answers merged");
    return sessionView(session);
  });

  app.post("/api/sessions/:id/confirm", async (req) => {
    const { id } = Params.parse(req.params);
    const { profile } = ConfirmBody.parse(req.body);
    const session = confirmSession(deps, id, profile);
    req.log.info({ sessionId: id, status: session.status }, "session confirmed");
    return { sessionId: id, status: session.status, assumptions: session.assumptions };
  });
}
