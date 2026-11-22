import type { Category, CategoryEvent } from "@venturecraft/schemas";
import type { CategoryModule } from "../categories/types.js";
import type { LlmClient } from "../llm/client.js";
import { TtlCache } from "../research/cache.js";
import type { Bundle } from "../research/pipeline.js";
import { transition } from "../session/stateMachine.js";
import type { SessionStore } from "../session/store.js";
import type { CategoryOutcome, Session } from "../session/types.js";
import { SessionBudget } from "../tinyfish/budget.js";
import type { WebResearch } from "../tinyfish/types.js";
import { withTimeout } from "../util/timeout.js";
import type { EventHub } from "./events.js";

export interface OrchestratorDeps {
  store: SessionStore;
  hub: EventHub;
  modules: readonly CategoryModule[];
  llm: LlmClient;
  /** Builds the web client for one session so its budget is private to that session. */
  createWeb: (budget: SessionBudget) => WebResearch;
  fixtures: boolean;
  jobTimeoutMs: number;
  maxSearches: number;
  maxFetches: number;
  cacheTtlMs: number;
  log: (msg: string, fields: Record<string, unknown>) => void;
  now?: () => Date;
}

export interface Orchestrator {
  run(session: Session): Promise<void>;
}

const reasonOf = (err: unknown): string => (err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 300) : "unknown error");

export function createOrchestrator(deps: OrchestratorDeps): Orchestrator {
  const cache = new TtlCache<Bundle>(deps.cacheTtlMs);
  const now = deps.now ?? (() => new Date());

  return {
    async run(session: Session): Promise<void> {
      const profile = session.profile;
      if (!profile) throw new Error("session has no confirmed profile");
      const budget = new SessionBudget(deps.maxSearches, deps.maxFetches);
      const web = deps.createWeb(budget);
      const results: Partial<Record<Category, CategoryOutcome>> = {};
      const emit = (e: CategoryEvent): void => deps.hub.append(session.id, e);

      deps.modules.forEach((m) => emit({ type: "queued", category: m.category }));

      // One failing category never fails the session: every job settles on its own.
      await Promise.allSettled(
        deps.modules.map(async (m) => {
          const missingFields = m.needs.filter((f) => profile[f] === undefined);
          if (missingFields.length > 0) {
            results[m.category] = { status: "insufficient_profile", missingFields };
            emit({ type: "insufficient_profile", category: m.category, missingFields });
            return;
          }
          try {
            const data = await withTimeout(
              m.run({ profile, assumptions: session.assumptions, web, llm: deps.llm, cache, emit, fixtures: deps.fixtures, now }),
              deps.jobTimeoutMs,
              m.category,
            );
            results[m.category] = { status: "done", data };
            emit({ type: "done", category: m.category, result: data });
          } catch (err) {
            const reason = reasonOf(err);
            results[m.category] = { status: "failed", reason };
            emit({ type: "failed", category: m.category, reason });
            deps.log("category failed", { sessionId: session.id, category: m.category, reason });
          }
        }),
      );

      const failedCategories = (Object.entries(results) as Array<[Category, CategoryOutcome]>)
        .filter(([, r]) => r.status === "failed")
        .map(([c]) => c);
      const latest = deps.store.get(session.id);
      deps.store.save({ ...latest, results, status: transition(latest.status, "done") });
      deps.hub.append(session.id, { type: "session_done", failedCategories });
      deps.log("session done", { sessionId: session.id, usage: budget.usage(), failedCategories });
    },
  };
}
