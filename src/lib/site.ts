import { useEffect, useState } from "react";

/** Used for SSR/prerender only; the browser swaps in the real origin on mount. */
export const FALLBACK_ORIGIN = "https://agent-nexus.lovable.app";

/** Current site origin, hydration-safe. */
export function useOrigin() {
  const [origin, setOrigin] = useState(FALLBACK_ORIGIN);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  return origin;
}

export type Snippet = {
  id: string;
  client: string;
  hint: string;
  language: string;
  code: (origin: string) => string;
};

export const MCP_SNIPPETS: Snippet[] = [
  {
    id: "claude-code",
    client: "Claude Code",
    hint: "One command. OAuth opens in the browser on first call.",
    language: "bash",
    code: (o) => `claude mcp add --transport http agent-nexus ${o}/mcp`,
  },
  {
    id: "claude-desktop",
    client: "Claude Desktop",
    hint: "claude_desktop_config.json → mcpServers",
    language: "json",
    code: (o) =>
      JSON.stringify(
        { mcpServers: { "agent-nexus": { type: "http", url: `${o}/mcp` } } },
        null,
        2,
      ),
  },
  {
    id: "cursor",
    client: "Cursor",
    hint: "~/.cursor/mcp.json or .cursor/mcp.json in the repo",
    language: "json",
    code: (o) =>
      JSON.stringify(
        { mcpServers: { "agent-nexus": { url: `${o}/mcp` } } },
        null,
        2,
      ),
  },
  {
    id: "vscode",
    client: "VS Code / Copilot",
    hint: ".vscode/mcp.json",
    language: "json",
    code: (o) =>
      JSON.stringify(
        { servers: { "agent-nexus": { type: "http", url: `${o}/mcp` } } },
        null,
        2,
      ),
  },
  {
    id: "windsurf",
    client: "Windsurf",
    hint: "~/.codeium/windsurf/mcp_config.json",
    language: "json",
    code: (o) =>
      JSON.stringify(
        { mcpServers: { "agent-nexus": { serverUrl: `${o}/mcp` } } },
        null,
        2,
      ),
  },
  {
    id: "raw",
    client: "Raw MCP (any client)",
    hint: "Streamable HTTP endpoint. Accept both content types.",
    language: "bash",
    code: (o) => `curl -X POST ${o}/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
  },
];

export const NO_AUTH_SNIPPETS: Snippet[] = [
  {
    id: "discover",
    client: "Need → callable interface",
    hint: "The one call that matters. No key, no account.",
    language: "bash",
    code: (o) => `curl "${o}/api/public/discover?need=send+a+transactional+email"`,
  },
  {
    id: "search",
    client: "Keyword search",
    hint: "Filter the registry as JSON.",
    language: "bash",
    code: (o) => `curl "${o}/api/public/registry?q=postgres&category=mcp"`,
  },
  {
    id: "llms",
    client: "Whole catalog as context",
    hint: "Drop straight into a system prompt.",
    language: "bash",
    code: (o) => `curl ${o}/llms.txt`,
  },
  {
    id: "report",
    client: "Report what happened",
    hint: "Close the loop after a real invocation.",
    language: "bash",
    code: (o) => `curl -X POST ${o}/api/public/report \\
  -H "Content-Type: application/json" \\
  -d '{"slug":"resend-api","outcome":"success","latency_ms":220}'`,
  },
];

export const AGENT_EXAMPLE = (o: string) => `# An agent picking its own tool, with no human in the loop.
import requests

need = "convert a video to mp4"

r = requests.get(f"${o}/api/public/discover", params={"need": need, "limit": 1}).json()

if r["coverage"] == "none":
    print("Nexus has no interface for this yet:", r["note"])
else:
    m = r["matches"][0]
    print(m["name"], m["call"]["endpoint"])
    print("auth:", m["call"]["auth_mode"])
    print("reliability:", m["trust"]["reliability_score"], "uptime:", m["trust"]["uptime"])
    print("call it like:", m["call"]["example"])

    # ...agent performs the call, then closes the loop:
    requests.post(f"${o}/api/public/report", json={
        "slug": m["slug"], "outcome": "success", "latency_ms": 412,
    })`;
