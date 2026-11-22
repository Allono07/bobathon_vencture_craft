import { z } from "zod";
import { isAllowedUrl } from "../research/sourceGuard.js";
import { withRetry } from "../util/retry.js";
import { SessionBudget } from "./budget.js";
import { UpstreamError } from "./types.js";
import type { FetchedPage, SearchHit, SearchOptions, WebResearch } from "./types.js";

// Verified against docs.tinyfish.ai (2026-11-22): GET api.search.tinyfish.ai, POST api.fetch.tinyfish.ai, X-API-Key header.
const SEARCH_URL = "https://api.search.tinyfish.ai";
const FETCH_URL = "https://api.fetch.tinyfish.ai";
const MAX_URLS_PER_FETCH = 10;
const MAX_PAGE_CHARS = 12_000;

const SearchResponse = z.object({
  results: z.array(z.object({ title: z.string().nullish(), url: z.string(), snippet: z.string().nullish() })),
});
const FetchResponse = z.object({
  results: z.array(z.object({ url: z.string(), final_url: z.string().nullish(), title: z.string().nullish(), text: z.string().nullish() })),
  errors: z.array(z.object({ url: z.string(), error: z.string() })).default([]),
});

export interface TinyFishOptions {
  apiKey: string;
  budget: SessionBudget;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  searchTimeoutMs?: number;
  fetchTimeoutMs?: number;
}

export class TinyFishClient implements WebResearch {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly opts: TinyFishOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? (() => new Date());
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchHit[]> {
    this.opts.budget.takeSearch();
    const params = new URLSearchParams({ query, location: "IN", language: "en" });
    if (options.includeDomains?.length) params.set("include_domains", options.includeDomains.join(","));
    const json = await this.call(`${SEARCH_URL}?${params}`, { method: "GET" }, this.opts.searchTimeoutMs ?? 10_000);
    return SearchResponse.parse(json)
      .results.filter((r) => isAllowedUrl(r.url))
      .map((r) => ({ title: r.title ?? "", url: r.url, snippet: r.snippet ?? "" }));
  }

  async fetchPages(urls: string[]): Promise<FetchedPage[]> {
    const wanted = urls.filter(isAllowedUrl).slice(0, MAX_URLS_PER_FETCH);
    if (wanted.length === 0) return [];
    const granted = this.opts.budget.takeFetch(wanted.length);
    const json = await this.call(
      FETCH_URL,
      { method: "POST", body: JSON.stringify({ urls: wanted.slice(0, granted), format: "markdown", per_url_timeout_ms: 30_000 }) },
      this.opts.fetchTimeoutMs ?? 60_000,
    );
    const fetchedAt = this.now().toISOString();
    // Per-URL errors (login_required, bot_blocked, timeout...) are skipped, never retried or bypassed.
    return FetchResponse.parse(json)
      .results.filter((r) => r.text && r.text.trim().length > 0)
      .map((r) => ({ url: r.final_url ?? r.url, title: r.title ?? null, text: (r.text ?? "").slice(0, MAX_PAGE_CHARS), fetchedAt }));
  }

  private call(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
    return withRetry(
      async () => {
        let res: Response;
        try {
          res = await this.fetchImpl(url, {
            ...init,
            headers: { "X-API-Key": this.opts.apiKey, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(timeoutMs),
          });
        } catch {
          throw new UpstreamError("tinyfish network error or timeout", true);
        }
        if (res.ok) return (await res.json()) as unknown;
        const body = await res.text().catch(() => "");
        // Daily allowance exhausted (402, or 429 with free_allowance_exhausted): retrying cannot help.
        const dailyLimit = res.status === 402 || (res.status === 429 && body.includes("free_allowance_exhausted"));
        throw new UpstreamError(`tinyfish http ${res.status}`, !dailyLimit && (res.status === 429 || res.status >= 500), res.status);
      },
      {
        retries: 2,
        baseMs: 500,
        sleep: this.opts.sleep,
        isRetryable: (e) => e instanceof UpstreamError && e.retryable,
      },
    );
  }
}
