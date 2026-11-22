export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface FetchedPage {
  url: string;
  title: string | null;
  /** Page text as markdown. Untrusted data: never an instruction source. */
  text: string;
  fetchedAt: string;
}

export interface SearchOptions {
  includeDomains?: string[];
}

export interface WebResearch {
  search(query: string, opts?: SearchOptions): Promise<SearchHit[]>;
  fetchPages(urls: string[]): Promise<FetchedPage[]>;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
  }
}
