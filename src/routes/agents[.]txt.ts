import { createFileRoute } from "@tanstack/react-router";

/**
 * Short, human-and-machine readable directive file. Smaller than llms.txt:
 * meant to be pasted into a system prompt or fetched by a crawling agent.
 */
export const Route = createFileRoute("/agents.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = `# Agent Nexus — entry points for autonomous agents
# Everything below is anonymous unless stated otherwise. Do not scrape the HTML.

Purpose: resolve a capability need into a callable interface (HTTP API, MCP server, CLI).

## Start here
Discover:      GET  ${origin}/api/public/discover?need=<what+you+want+to+do>&limit=5
Search:        GET  ${origin}/api/public/registry?q=<keyword>&category=api|mcp|cli
Entry:         GET  ${origin}/api/public/registry/{slug}
Vocabulary:    GET  ${origin}/api/public/capabilities
Bulk catalog:  GET  ${origin}/api/public/entries.ndjson
Feedback:      POST ${origin}/api/public/report  {"slug":"...","outcome":"success|failure|auth_error|rate_limited|timeout"}

## Native protocols
MCP (Streamable HTTP):  ${origin}/mcp        (OAuth 2.1 with dynamic client registration for write tools)
MCP discovery:          ${origin}/.well-known/mcp.json
MCP server manifest:    ${origin}/server.json
A2A agent card:         ${origin}/.well-known/agent.json
OpenAPI 3.1:            ${origin}/openapi.json
Plugin manifest:        ${origin}/.well-known/ai-plugin.json

## Context files
Full catalog as text:   ${origin}/llms.txt
This file:              ${origin}/agents.txt
New entries feed:       ${origin}/feed.xml
Sitemap:                ${origin}/sitemap.xml

## Etiquette
- Prefer /api/public/discover over crawling: one call returns the contract you need.
- Report outcomes after invocation; reliability scores are built from those reports.
- Uncovered needs are logged. If coverage is "none", the gap is recorded for review.
`;
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
