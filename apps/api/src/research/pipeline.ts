import type { Category, CategoryEvent } from "@venturecraft/schemas";
import { BudgetExceededError } from "../tinyfish/budget.js";
import type { FetchedPage, SearchHit, WebResearch } from "../tinyfish/types.js";
import { TtlCache, cacheKey } from "./cache.js";

export interface Bundle {
  hits: SearchHit[];
  pages: FetchedPage[];
}

export interface GatherContext {
  category: Category;
  web: WebResearch;
  cache: TtlCache<Bundle>;
  emit: (event: CategoryEvent) => void;
}

const PAGES_PER_QUERY = 2;
const DEFAULT_MAX_PAGES = 6;

/**
 * Search each query, read the top results, and return deduplicated page documents.
 * Results are cached per (category, normalized query). A spent budget or a failed query
 * yields partial results; the error is raised only when nothing at all was gathered.
 */
export async function gather(
  ctx: GatherContext,
  queries: readonly string[],
  opts: { includeDomains?: string[]; maxPages?: number } = {},
): Promise<FetchedPage[]> {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const pages = new Map<string, FetchedPage>();
  let lastError: unknown;

  for (const query of queries) {
    if (pages.size >= maxPages) break;
    const key = cacheKey(ctx.category, query);
    let bundle = ctx.cache.get(key);
    if (!bundle) {
      try {
        ctx.emit({ type: "searching", category: ctx.category, query });
        const hits = await ctx.web.search(query, { includeDomains: opts.includeDomains });
        const urls = hits.slice(0, PAGES_PER_QUERY).map((h) => h.url);
        urls.forEach((url) => ctx.emit({ type: "reading", category: ctx.category, url }));
        const fetched = urls.length > 0 ? await ctx.web.fetchPages(urls) : [];
        bundle = { hits, pages: fetched };
        ctx.cache.set(key, bundle);
      } catch (err) {
        if (err instanceof BudgetExceededError) break;
        lastError = err;
        continue;
      }
    }
    for (const page of bundle.pages) if (pages.size < maxPages) pages.set(page.url, page);
  }

  if (pages.size === 0 && lastError) throw lastError;
  return [...pages.values()];
}
