import { describe, it, expect } from "vitest";
import { buildMonthlyReport, previousMonth, monthlyIdempotencyKey } from "./publisher-monthly";
import { buildEntryReport } from "./entry-report";

const opens = [
  { actor: "a", user_agent: "claude-code/1.0", created_at: "2026-10-02T00:00:00Z" },
  { actor: "a", user_agent: "claude-code/1.0", created_at: "2026-10-05T00:00:00Z" },
  { actor: "b", user_agent: "Googlebot/2.1", created_at: "2026-10-03T00:00:00Z" },
  { actor: "c", user_agent: "mcpbeat-monitor", created_at: "2026-10-03T00:00:00Z" },
];
const report = buildEntryReport(opens, [{ source: "mcp_discover", created_at: "2026-10-02T00:00:00Z" }], 31);
const base = { entryName: "X", slug: "x", month: "2026-10", report, successReports: 1, checks: 100, checksOk: 97, incidents: [{ at: "2026-10-04", detail: "HTTP 503" }] };

describe("monthly publisher report", () => {
  it("never counts crawlers or monitors as genuine opens", () => {
    const m = buildMonthlyReport({ ...base, paying: true });
    expect(m.lines.find((l) => l.label.startsWith("Listing opens"))!.value).toBe("2");
    expect(m.robotNote).toMatch(/^2 additional opens/);
  });
  it("paying publishers get the full report with incidents", () => {
    const m = buildMonthlyReport({ ...base, paying: true });
    expect(m.lines).toHaveLength(6);
    expect(m.incidents).toHaveLength(1);
  });
  it("non-paying get the short version and the upgrade note", () => {
    const m = buildMonthlyReport({ ...base, paying: false });
    expect(m.lines).toHaveLength(3);
    expect(m.incidents).toHaveLength(0);
    expect(m.recommendations.some((r) => r.includes("$49/month"))).toBe(true);
  });
  it("covers the previous month and dedupes per entry and month", () => {
    expect(previousMonth(new Date("2026-12-01T05:00:00Z"))).toBe("2026-11");
    expect(previousMonth(new Date("2027-01-01T05:00:00Z"))).toBe("2026-12");
    expect(monthlyIdempotencyKey("e1", "2026-11")).toBe("monthly:e1:2026-11");
  });
});
