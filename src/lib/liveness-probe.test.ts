import { afterEach, describe, expect, it, vi } from "vitest";
import { probeLivenessOnce } from "./liveness-probe.server";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("liveness HTTP fallback", () => {
  it("a timed-out HEAD gives GET a fresh non-aborted signal", async () => {
    vi.useFakeTimers();
    const methods: string[] = [];
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => {
      methods.push(String(init.method));
      if (init.method === "HEAD") return new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new Error("timeout"))));
      expect(init.signal?.aborted).toBe(false);
      return Promise.resolve(new Response(null, { status: 405 }));
    }));
    const result = probeLivenessOnce("https://mcp.example.test");
    await vi.advanceTimersByTimeAsync(8000);
    expect((await result).ok).toBe(true);
    expect(methods).toEqual(["HEAD", "GET"]);
  });
  it("confirmation can use GET directly and preserves genuine server failures", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 502 }));
    vi.stubGlobal("fetch", fetcher);
    const result = await probeLivenessOnce("https://mcp.example.test", "GET");
    expect(fetcher.mock.calls[0]?.[1].method).toBe("GET");
    expect(result.ok).toBe(false);
    expect(result.status_code).toBe(502);
  });
});