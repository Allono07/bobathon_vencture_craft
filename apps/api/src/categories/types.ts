import type { Assumption, BusinessProfile, Category, CategoryEvent, ProfileField } from "@venturecraft/schemas";
import type { LlmClient } from "../llm/client.js";
import type { Bundle } from "../research/pipeline.js";
import type { TtlCache } from "../research/cache.js";
import type { WebResearch } from "../tinyfish/types.js";

export interface ModuleContext {
  profile: BusinessProfile;
  assumptions: readonly Assumption[];
  web: WebResearch;
  llm: LlmClient;
  cache: TtlCache<Bundle>;
  emit: (event: CategoryEvent) => void;
  /** USE_FIXTURES: serve labelled sample data, make no TinyFish calls. */
  fixtures: boolean;
  now: () => Date;
}

export interface CategoryModule {
  category: Category;
  /** Profile fields this module needs; if any is neither known nor assumed it reports insufficient_profile. */
  needs: readonly ProfileField[];
  run(ctx: ModuleContext): Promise<Record<string, unknown>>;
}
