export class BudgetExceededError extends Error {}

/** Per-session cap on paid-or-quota web calls, shared by all category jobs of that session. */
export class SessionBudget {
  private searches = 0;
  private fetches = 0;

  constructor(
    readonly maxSearches: number,
    readonly maxFetches: number,
  ) {}

  takeSearch(): void {
    if (this.searches >= this.maxSearches) throw new BudgetExceededError("search budget exhausted");
    this.searches++;
  }

  /** Reserves up to `n` URL fetches and returns how many were granted. Throws when none are left. */
  takeFetch(n: number): number {
    const left = this.maxFetches - this.fetches;
    if (left <= 0) throw new BudgetExceededError("fetch budget exhausted");
    const granted = Math.min(n, left);
    this.fetches += granted;
    return granted;
  }

  usage(): { searches: number; fetches: number } {
    return { searches: this.searches, fetches: this.fetches };
  }
}
