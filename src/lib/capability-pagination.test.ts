import { afterEach, describe, expect, it, vi } from "vitest";
import { probeCapabilities } from "./capability-probe.server";

const rpc = (result: unknown) => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200, headers: { "content-type": "application/json" } });

function mockServer(page2: () => Response) {
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (body.method === "initialize") return rpc({ protocolVersion: "2025-06-18" });
    if (!body.params?.cursor) return rpc({ tools: [{ name: "a", inputSchema: {} }], nextCursor: "p2" });
    return page2();
  }));
}
const entry = { category: "mcp", endpoint: "https://example.com/mcp" } as any;
afterEach(() => vi.unstubAllGlobals());

describe("tools/list pagination", () => {
  it("flags a failed page two as a partial check, not a clean pass", async () => {
    mockServer(() => new Response("boom", { status: 500 }));
    const r = await probeCapabilities(entry);
    expect(r.paginationTruncated).toBe(true);
    expect(r.detail.startsWith("PARTIAL:")).toBe(true);
  });
  it("a fully read list is not flagged", async () => {
    mockServer(() => rpc({ tools: [{ name: "b", inputSchema: {} }] }));
    const r = await probeCapabilities(entry);
    expect(r.paginationTruncated).toBeUndefined();
    expect(r.tools).toEqual(["a", "b"]);
  });
});
