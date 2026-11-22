import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((v) => v === "true");

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  LLM_PROVIDER: z.enum(["groq"]).default("groq"),
  LLM_API_KEY: z.string().default(""),
  LLM_MODEL: z.string().default(""),
  TINYFISH_API_KEY: z.string().default(""),
  USE_FIXTURES: bool.default(true),
  MAX_IDEA_CHARS: z.coerce.number().int().min(100).max(20000).default(4000),
  CACHE_TTL_HOURS: z.coerce.number().positive().default(24),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30),
  SESSION_MAX_SEARCHES: z.coerce.number().int().positive().default(12),
  SESSION_MAX_FETCHES: z.coerce.number().int().positive().default(25),
  JOB_TIMEOUT_MS: z.coerce.number().int().positive().default(90000),
});
export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const cfg = EnvSchema.parse(env);
  if (!cfg.USE_FIXTURES && (!cfg.TINYFISH_API_KEY || !cfg.LLM_API_KEY || !cfg.LLM_MODEL)) {
    throw new Error("USE_FIXTURES=false requires TINYFISH_API_KEY, LLM_API_KEY and LLM_MODEL");
  }
  return cfg;
}
