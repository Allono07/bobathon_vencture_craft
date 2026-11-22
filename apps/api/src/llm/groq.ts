import { z } from "zod";
import { UpstreamError } from "../tinyfish/types.js";
import { withRetry } from "../util/retry.js";
import type { LlmClient } from "./client.js";

// Verified against console.groq.com docs (2026-11-22): OpenAI-compatible base https://api.groq.com/openai/v1,
// chat completions with response_format {"type":"json_object"}. The model id comes from LLM_MODEL (not hard-coded).
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const ChatResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

export interface GroqOptions {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  /** Max simultaneous requests; keeps us under free-tier rate limits. */
  concurrency?: number;
}

export class GroqLlmClient implements LlmClient {
  private readonly fetchImpl: typeof fetch;
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly opts: GroqOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async complete(input: { system: string; user: string; json?: boolean }): Promise<string> {
    await this.acquire();
    try {
      return await withRetry(() => this.request(input), {
        retries: 2,
        baseMs: 1000,
        sleep: this.opts.sleep,
        isRetryable: (e) => e instanceof UpstreamError && e.retryable,
      });
    } finally {
      this.release();
    }
  }

  private async request(input: { system: string; user: string; json?: boolean }): Promise<string> {
    let res: Response;
    try {
      res = await this.fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.opts.model,
          temperature: 0,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user },
          ],
          ...(input.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 60_000),
      });
    } catch {
      throw new UpstreamError("llm network error or timeout", true);
    }
    if (!res.ok) throw new UpstreamError(`llm http ${res.status}`, res.status === 429 || res.status >= 500, res.status);
    const parsed = ChatResponse.parse(await res.json());
    return parsed.choices[0]?.message.content ?? "";
  }

  private async acquire(): Promise<void> {
    const limit = this.opts.concurrency ?? 2;
    if (this.active < limit) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active--;
  }
}
