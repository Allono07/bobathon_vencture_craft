import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { StateError } from "../errors.js";
import type { EventHub, LoggedEvent } from "../orchestrator/events.js";
import type { SessionStore } from "../session/store.js";

const Params = z.strictObject({ id: z.uuid() });
const HEARTBEAT_MS = 15_000;

const frame = ({ id, event }: LoggedEvent): string => `id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

export function registerStreamRoutes(app: FastifyInstance, deps: { store: SessionStore; hub: EventHub; corsOrigin: string }): void {
  // Per-category events as each finishes, then a final "session_done". Reconnect with Last-Event-ID to replay.
  app.get("/api/sessions/:id/stream", async (req, reply) => {
    const { id } = Params.parse(req.params);
    const session = deps.store.get(id);
    if (session.status !== "researching" && session.status !== "done") {
      throw new StateError("research has not started: confirm the profile first");
    }
    const lastId = Number(req.headers["last-event-id"] ?? 0) || 0;

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": deps.corsOrigin,
    });

    let closed = false;
    const finish = (): void => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    };
    const send = (e: LoggedEvent): void => {
      if (closed) return;
      res.write(frame(e));
      if (e.event.type === "session_done") finish();
    };

    const heartbeat = setInterval(() => !closed && res.write(": keep-alive\n\n"), HEARTBEAT_MS);
    const unsubscribe = deps.hub.subscribe(id, send);
    req.raw.on("close", finish);
    for (const e of deps.hub.replay(id, lastId)) send(e);
  });
}
