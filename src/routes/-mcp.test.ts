import { describe, expect, it, vi } from "vitest";

const protectedHandler = vi.hoisted(() => vi.fn(async () => new Response('{"error":"unauthorized"}', { status: 401 })));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@lovable.dev/mcp-js/stacks/tanstack", () => ({ createTanStackMcpHandler: () => protectedHandler }));
vi.mock("../lib/mcp/index", () => ({ default: {} }));
import { mcpHandler } from "./mcp";

describe("MCP transport dispatch", () => {
  it("malformed anonymous JSON gets a parse error, not a false authentication requirement", async () => {
    const response = await mcpHandler({ request: new Request("https://agentnexus.app/mcp", { method: "POST", body: "{broken" }) });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe(-32700);
    expect(protectedHandler).not.toHaveBeenCalled();
  });
  it("authenticated requests remain behind the protected handler", async () => {
    const response = await mcpHandler({ request: new Request("https://agentnexus.app/mcp", { method: "POST", body: "{broken", headers: { authorization: "Bearer test-only" } }) });
    expect(response.status).toBe(401);
    expect(protectedHandler).toHaveBeenCalledOnce();
  });
});