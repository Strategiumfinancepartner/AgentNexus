import { describe, it, expect } from "vitest";
import { buildFunnel, type FunnelCaller } from "./adoption-funnel";

const c = (o: Partial<FunnelCaller>): FunnelCaller => ({ tier: "anonymous", connected: true, toolsList: false, searched: false, openedEntry: false, reported: false, usefulDays: [], ...o });

describe("adoption funnel", () => {
  const today = "2026-11-09"; // Monday
  const callers = [
    c({ toolsList: true }),
    c({ searched: true, usefulDays: ["2026-11-08"] }),
    c({ tier: "identified", searched: true, openedEntry: true, usefulDays: ["2026-10-30", "2026-11-09"] }),
    c({ tier: "paying", openedEntry: true, reported: true, usefulDays: ["2026-10-20"] }),
  ];
  const f = buildFunnel(callers, today);
  const get = (k: string) => f.stages.find((s) => s.key === k)!.count;

  it("counts each stage", () => {
    expect(get("callers")).toBe(4);
    expect(get("tools_list")).toBe(1);
    expect(get("searched")).toBe(2);
    expect(get("useful_result")).toBe(1);
    expect(get("reported")).toBe(1);
    expect(get("repeat")).toBe(1);
  });
  it("D7 only counts callers old enough, retained if active 7+ days after first", () => {
    expect(f.d7).toMatchObject({ eligible: 2, retained: 1, rate: 50 });
  });
  it("weekly KPI ignores anonymous callers and needs a previous week", () => {
    expect(f.weeklyKpi.value).toBe(1);
  });
  it("splits anonymous, identified and paying", () => {
    expect(f.byTier.map((t) => t.callers)).toEqual([2, 1, 1]);
  });
});
