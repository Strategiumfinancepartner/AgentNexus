import { describe, expect, it } from "vitest";
import { buildEntryReport } from "./entry-report";

describe("buildEntryReport", () => {
  const opens = [
    { actor: "a", user_agent: "openai-mcp/1.0", created_at: "2026-10-20T10:00:00Z" },
    { actor: "a", user_agent: "openai-mcp/1.0", created_at: "2026-10-21T10:00:00Z" },
    { actor: "b", user_agent: "curl/8", created_at: "2026-10-21T11:00:00Z" },
    { actor: "c", user_agent: "SentinelOracle monitor", created_at: "2026-10-20T09:00:00Z" },
    { actor: "c", user_agent: "SentinelOracle monitor", created_at: "2026-10-21T09:00:00Z" },
  ];

  it("keeps robot opens out of the human/agent count", () => {
    const r = buildEntryReport(opens, [], 30);
    expect(r.opens).toEqual({ total: 5, byHumansAndAgents: 3, byRobots: 2 });
  });

  it("counts a returning caller only when seen on 2+ days and never counts robots", () => {
    const r = buildEntryReport(opens, [], 30);
    expect(r.callers).toEqual({ distinct: 3, aiAgents: 1, developers: 1, robots: 1, returning: 1 });
  });

  it("splits search appearances by MCP and HTTP", () => {
    const r = buildEntryReport([], [
      { source: "mcp_discover", created_at: "x" },
      { source: "mcp_search", created_at: "x" },
      { source: "http_discover", created_at: "x" },
    ], 30);
    expect(r.appearances).toEqual({ total: 3, mcp: 2, http: 1 });
  });
});
