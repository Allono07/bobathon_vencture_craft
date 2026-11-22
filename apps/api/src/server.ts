import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { InputError, NotFoundError, StateError } from "./errors.js";
import { registerSessionRoutes } from "./http/sessions.routes.js";
import type { ServiceDeps } from "./session/service.js";

export interface ServerOptions {
  rateLimitPerMinute: number;
  logger?: boolean;
}

export async function buildServer(deps: ServiceDeps, opts: ServerOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 64 * 1024,
  });

  // Per-IP limit (the plugin keys on request IP by default).
  await app.register(rateLimit, { max: opts.rateLimitPerMinute, timeWindow: "1 minute" });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError || err instanceof InputError) {
      return reply.code(400).send({ error: "invalid_input", message: err instanceof InputError ? err.message : "invalid request body" });
    }
    if (err instanceof NotFoundError) return reply.code(404).send({ error: "not_found" });
    if (err instanceof StateError) return reply.code(409).send({ error: "invalid_state", message: err.message });
    const status = (err as { statusCode?: unknown }).statusCode;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return reply.code(status).send({ error: "request_error", message: (err as { message?: string }).message ?? "bad request" });
    }
    req.log.error({ err }, "unhandled error");
    return reply.code(500).send({ error: "internal_error" });
  });

  registerSessionRoutes(app, deps);
  return app;
}
