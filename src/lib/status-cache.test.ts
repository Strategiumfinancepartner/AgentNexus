import { describe, it, expect } from "vitest";
import { statusCacheValid, STATUS_CACHE_TTL_MS } from "./status.functions";

describe("status cache freshness", () => {
  const cache = { at: 1_000, latestCheck: "2026-11-23T08:00:00Z" };
  it("serves the cache within 60 s when no new check arrived", () => {
    expect(STATUS_CACHE_TTL_MS).toBe(60_000);
    expect(statusCacheValid(cache, "2026-11-23T08:00:00Z", 1_000 + 59_999)).toBe(true);
  });
  it("expires after 60 s", () => {
    expect(statusCacheValid(cache, "2026-11-23T08:00:00Z", 1_000 + 60_000)).toBe(false);
  });
  it("invalidates as soon as a new health check is recorded", () => {
    expect(statusCacheValid(cache, "2026-11-23T08:01:00Z", 2_000)).toBe(false);
  });
  it("bypasses the cache when the freshness lookup fails", () => {
    expect(statusCacheValid(cache, undefined, 2_000)).toBe(false);
  });
});
