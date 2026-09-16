import { createFileRoute } from "@tanstack/react-router";

// /.well-known/agents.json — structured twin of /agents.txt for agents that
// prefer JSON over plain text.
export const Route = createFileRoute("/.well-known/agents/json")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://agentnexus.app";
        return new Response(
          JSON.stringify(
            {
              name: "agent-nexus",
              title: "Agent Nexus",
              version: "0.3.0",
              description:
                "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call. Resolve a capability need into a callable interface.",
              websiteUrl: origin,
              anonymous: true,
              endpoints: [
                { method: "GET", path: `${origin}/api/public/discover`, query: "need=<what+you+want+to+do>&limit=5", description: "Resolve a need into callable interfaces with auth contract and reliability" },
                { method: "GET", path: `${origin}/api/public/registry`, query: "q=<keyword>&category=api|mcp|cli", description: "Search the registry" },
                { method: "GET", path: `${origin}/api/public/registry/{slug}`, description: "Full entry: auth, formats, rate limits, uptime" },
                { method: "GET", path: `${origin}/api/public/capabilities`, description: "Capability vocabulary" },
                { method: "GET", path: `${origin}/api/public/entries.ndjson`, description: "Bulk catalog, newline-delimited JSON" },
                { method: "GET", path: `${origin}/api/public/status`, query: "?slug={slug}", description: "Live uptime" },
                { method: "POST", path: `${origin}/api/public/report`, body: '{"slug":"...","outcome":"success|failure|auth_error|rate_limited|timeout"}', description: "Report an invocation outcome; feeds reliability scores" },
              ],
              autonomous: [
                { method: "POST", path: `${origin}/api/public/keys`, body: '{"agent":"your-name"}', description: "Self-register, returns an x-api-key immediately (nx_…)" },
                { path: `${origin}/api/public/mcp`, description: "MCP read-only, no auth, no consent screen, Streamable HTTP, stateless" },
              ],
              protocols: [
                { path: `${origin}/mcp`, description: "MCP Streamable HTTP, OAuth 2.1 for write tools" },
                { path: `${origin}/.well-known/mcp.json`, description: "MCP discovery" },
                { path: `${origin}/server.json`, description: "MCP server manifest" },
                { path: `${origin}/.well-known/agent.json`, description: "A2A agent card" },
                { path: `${origin}/openapi.json`, description: "OpenAPI 3.1" },
                { path: `${origin}/.well-known/ai-plugin.json`, description: "Plugin manifest" },
              ],
              context: [
                { path: `${origin}/llms.txt`, description: "Full catalog as text" },
                { path: `${origin}/agents.txt`, description: "This file, plain text" },
                { path: `${origin}/feed.xml`, description: "New entries feed" },
                { path: `${origin}/sitemap.xml`, description: "Sitemap" },
              ],
              etiquette: [
                "Prefer /api/public/discover over crawling: one call returns the contract you need.",
                "Report outcomes after invocation; reliability scores are built from those reports.",
                "Uncovered needs are logged. If coverage is 'none', the gap is recorded for review.",
              ],
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
