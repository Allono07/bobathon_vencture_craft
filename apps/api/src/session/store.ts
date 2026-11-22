import { NotFoundError } from "../errors.js";
import type { Session } from "./types.js";

export interface SessionStore {
  save(session: Session): void;
  get(id: string): Session;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  save(session: Session): void {
    this.sessions.set(session.id, session);
  }

  get(id: string): Session {
    const session = this.sessions.get(id);
    if (!session) throw new NotFoundError("session not found");
    return session;
  }
}
