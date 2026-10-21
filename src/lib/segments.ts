/**
 * Caller segmentation for reviewer analytics. Pure and browser-safe.
 * Order matters: publisher > crawler > ai_agent > monitor > developer.
 */
export type Segment = "publisher" | "crawler" | "ai_agent" | "monitor" | "developer";

export const SEGMENT_LABELS: Record<Segment, string> = {
  publisher: "Publishers (submitted an entry)",
  crawler: "Search & AI crawlers",
  ai_agent: "AI agent clients",
  monitor: "Directories & monitors",
  developer: "Developers & browsers (unverified humans)",
};

/** Our own test traffic (sandbox curl, log tests). Excluded from activation KPIs. */
const INTERNAL_ACTORS = new Set(["ip:789e5e7a2f832ce5d6595416bfab89c4"]);
export function isInternalCaller(actor: string, userAgent: string): boolean {
  return INTERNAL_ACTORS.has(actor) || /^nexus-/i.test(userAgent ?? "");
}

const CRAWLER =
  /(amazonbot|googlebot|googleother|google-extended|google-inspectiontool|bingbot|barkrowler|gptbot|oai-searchbot|claudebot|bytespider|petalbot|yandex|ahrefs|semrush|applebot|duckduck|baiduspider|spider|crawl|facebookexternalhit|mj12bot|dotbot)/i;
const AI_AGENT =
  /(codex|openai-mcp|claude-user|claude-code|anthropic|zed\/|opencode|cursor|windsurf|cline|gemini|copilot|chatgpt-user|perplexity-user|continue)/i;
const MONITOR =
  /(bot|probe|monitor|health|collector|index|observatory|scanner|rating|trust|watch|verif|engine|oracle|sentinel|mcpbeat|clono|glimind|aidoing|registry|postman|checker|scoring|evidence|bureau|ledger|intelligence|network|gateway)/i;

export function classifyCaller(userAgent: string, surfaces: Iterable<string>): Segment {
  // Status lookups are public reads, not proof of having submitted an entry.
  for (const s of surfaces) if (s === "submitted_entry") return "publisher";
  const ua = userAgent ?? "";
  if (CRAWLER.test(ua)) return "crawler";
  if (/(probe|scanner|health-check|healthcheck)/i.test(ua)) return "monitor";
  if (AI_AGENT.test(ua)) return "ai_agent";
  if (MONITOR.test(ua)) return "monitor";
  return "developer";
}

/** What a call was for, from its surface. MCP traffic is counted separately (tool not logged). */
export type Action = "search" | "catalog" | "entry" | "health" | "report" | "submit" | "submission_status" | "mcp" | "other";
export function actionOf(surface: string): Action {
  if (surface === "discover") return "search";
  if (surface === "registry" || surface === "capabilities") return "catalog";
  if (surface === "registry.entry" || surface === "entries.ndjson") return "entry";
  if (surface === "status" || surface.startsWith("health-card") || surface.startsWith("is-down")) return "health";
  if (surface === "report") return "report";
  if (surface === "submission") return "submission_status";
  if (surface === "mcp") return "mcp";
  return "other";
}

/** Business meaning of one MCP call, from the "#op" suffix recorded on its path. */
export type McpAction = "connect" | "tools_list" | "search" | "entry" | "submit" | "other_tool" | "technical" | "unknown";
export function mcpActionOf(path: string | null | undefined): McpAction {
  const op = (path ?? "").split("#")[1];
  if (!op) return "unknown";
  if (op === "initialize" || op === "notifications/initialized") return "connect";
  if (op === "tools/list") return "tools_list";
  if (op.startsWith("tools/call:")) {
    const tool = op.slice("tools/call:".length).split("?")[0];
    if (tool === "search_registry" || tool === "discover_capabilities") return "search";
    if (tool === "get_entry") return "entry";
    if (tool === "submit_entry") return "submit";
    return "other_tool";
  }
  return "technical";
}
