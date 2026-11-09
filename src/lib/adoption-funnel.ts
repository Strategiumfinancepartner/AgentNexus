/**
 * Adoption funnel over external callers (crawlers, monitors and internal test
 * traffic excluded upstream). Pure and browser-safe so it is unit-testable.
 */
export type CallerTier = "anonymous" | "identified" | "paying";

export type FunnelCaller = {
  tier: CallerTier;
  connected: boolean; // MCP initialize, or any HTTP call (an HTTP call is its own connection)
  toolsList: boolean;
  searched: boolean; // discover / search_registry / discover_capabilities
  openedEntry: boolean; // registry.entry, entries.ndjson or MCP get_entry
  reported: boolean; // report_invocation: the caller confirms it called the service found
  usefulDays: string[]; // YYYY-MM-DD days with a search or entry open
};

export type FunnelStage = { key: string; label: string; definition: string; count: number };

export const FUNNEL_DEFINITIONS: Record<string, string> = {
  callers: "Distinct external callers (by actor id) in the window, excluding search crawlers, directories/monitors and our own tests.",
  connected: "Opened an MCP session (initialize) or made at least one HTTP call to the public API.",
  tools_list: "Listed the MCP tools (tools/list). Reading the menu, not using it.",
  searched: "Ran a real search: HTTP /discover or MCP discover_capabilities / search_registry.",
  useful_result: "Searched AND then opened a listing — the search produced something worth reading.",
  opened_entry: "Opened at least one listing (HTTP registry entry, bulk export or MCP get_entry).",
  reported: "Confirmed it called the service it found (report_invocation). Strongest proof of a successful discovery.",
  repeat: "Made a useful action (search or listing open) on 2 or more different days.",
  d7: "Among callers whose first useful action is at least 7 days old: share who made another useful action 7+ days later.",
  weekly_kpi: "Main KPI — distinct identified accounts (key or signed-in user) with a useful action this ISO week AND in a previous week.",
};

function addDays(day: string, n: number) {
  const t = new Date(day + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function weekOf(day: string) {
  const t = new Date(day + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

export function buildFunnel(callers: FunnelCaller[], today: string) {
  const n = (f: (c: FunnelCaller) => boolean) => callers.filter(f).length;
  const stages: FunnelStage[] = [
    ["callers", "Distinct callers", () => true],
    ["connected", "Connected", (c: FunnelCaller) => c.connected],
    ["tools_list", "tools/list", (c: FunnelCaller) => c.toolsList],
    ["searched", "Actual searches", (c: FunnelCaller) => c.searched],
    ["useful_result", "Useful results", (c: FunnelCaller) => c.searched && c.openedEntry],
    ["opened_entry", "Listing openings", (c: FunnelCaller) => c.openedEntry],
    ["reported", "Successful discovery (reported)", (c: FunnelCaller) => c.reported],
    ["repeat", "Repeat on 2+ days", (c: FunnelCaller) => new Set(c.usefulDays).size >= 2],
  ].map(([key, label, f]) => ({ key: key as string, label: label as string, definition: FUNNEL_DEFINITIONS[key as string] ?? "", count: n(f as any) }));

  const cutoff = addDays(today, -7);
  const eligible = callers.filter((c) => c.usefulDays.length > 0 && ([...c.usefulDays].sort()[0] ?? "9999") <= cutoff);
  const retained = eligible.filter((c) => {
    const first = [...c.usefulDays].sort()[0] ?? today;
    return c.usefulDays.some((d) => d >= addDays(first, 7));
  }).length;
  const d7 = { eligible: eligible.length, retained, rate: eligible.length ? Math.round((retained / eligible.length) * 1000) / 10 : null, definition: FUNNEL_DEFINITIONS["d7"]! };

  const thisWeek = weekOf(today);
  const weeklyKpi = callers.filter(
    (c) => c.tier !== "anonymous" && c.usefulDays.some((d) => weekOf(d) === thisWeek) && c.usefulDays.some((d) => weekOf(d) < thisWeek),
  ).length;

  const byTier = (["anonymous", "identified", "paying"] as CallerTier[]).map((tier) => {
    const g = callers.filter((c) => c.tier === tier);
    return { tier, callers: g.length, searched: g.filter((c) => c.searched).length, repeat: g.filter((c) => new Set(c.usefulDays).size >= 2).length };
  });

  return { stages, d7, weeklyKpi: { value: weeklyKpi, definition: FUNNEL_DEFINITIONS["weekly_kpi"]! }, byTier };
}
