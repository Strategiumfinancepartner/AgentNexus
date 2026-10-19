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

const CRAWLER =
  /(amazonbot|googlebot|bingbot|barkrowler|gptbot|oai-searchbot|claudebot|bytespider|petalbot|yandex|ahrefs|semrush|applebot|duckduck|baiduspider|spider|crawl|facebookexternalhit|mj12bot|dotbot)/i;
const AI_AGENT =
  /(codex|openai-mcp|claude-user|claude-code|anthropic|zed\/|opencode|cursor|windsurf|cline|gemini|copilot|chatgpt-user|perplexity-user|continue)/i;
const MONITOR =
  /(bot|probe|monitor|health|collector|index|observatory|scanner|rating|trust|watch|verif|engine|oracle|sentinel|mcpbeat|clono|glimind|aidoing|registry|postman|checker|scoring|evidence|bureau|ledger|intelligence|network|gateway)/i;

export function classifyCaller(userAgent: string, surfaces: Iterable<string>): Segment {
  for (const s of surfaces) if (s === "submission") return "publisher";
  const ua = userAgent ?? "";
  if (CRAWLER.test(ua)) return "crawler";
  if (AI_AGENT.test(ua)) return "ai_agent";
  if (MONITOR.test(ua)) return "monitor";
  return "developer";
}

/** What a call was for, from its surface. MCP traffic is counted separately (tool not logged). */
export type Action = "search" | "entry" | "health" | "report" | "submit" | "mcp" | "other";
export function actionOf(surface: string): Action {
  if (surface === "discover" || surface === "registry" || surface === "capabilities") return "search";
  if (surface === "registry.entry" || surface === "entries.ndjson") return "entry";
  if (surface === "status" || surface.startsWith("health-card") || surface.startsWith("is-down")) return "health";
  if (surface === "report") return "report";
  if (surface === "submission") return "submit";
  if (surface === "mcp") return "mcp";
  return "other";
}
