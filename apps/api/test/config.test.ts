import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("has safe defaults with fixtures on", () => {
    const c = loadConfig({});
    expect(c.USE_FIXTURES).toBe(true);
    expect(c.CACHE_TTL_HOURS).toBe(24);
    expect(c.PORT).toBe(4000);
  });
  it("requires keys when fixtures are off", () => {
    expect(() => loadConfig({ USE_FIXTURES: "false" })).toThrow(/requires/);
    expect(
      loadConfig({ USE_FIXTURES: "false", TINYFISH_API_KEY: "a", LLM_API_KEY: "b", LLM_MODEL: "c" }).USE_FIXTURES,
    ).toBe(false);
  });
  it("rejects invalid values", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow();
  });
});
