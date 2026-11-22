import type { StreamEvent } from "@venturecraft/schemas";

export interface LoggedEvent {
  id: number;
  event: StreamEvent;
}

type Listener = (e: LoggedEvent) => void;

/** Per-session append-only event log with live subscribers, so late or reconnecting SSE clients can replay. */
export class EventHub {
  private readonly logs = new Map<string, LoggedEvent[]>();
  private readonly listeners = new Map<string, Set<Listener>>();

  append(sessionId: string, event: StreamEvent): void {
    const log = this.logs.get(sessionId) ?? [];
    const logged = { id: log.length + 1, event };
    log.push(logged);
    this.logs.set(sessionId, log);
    this.listeners.get(sessionId)?.forEach((fn) => fn(logged));
  }

  replay(sessionId: string, afterId = 0): LoggedEvent[] {
    return (this.logs.get(sessionId) ?? []).filter((e) => e.id > afterId);
  }

  subscribe(sessionId: string, fn: Listener): () => void {
    const set = this.listeners.get(sessionId) ?? new Set<Listener>();
    set.add(fn);
    this.listeners.set(sessionId, set);
    return () => set.delete(fn);
  }
}
