import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

/**
 * Short, human-and-machine readable directive file. Smaller than llms.txt:
 * meant to be pasted into a system prompt or fetched by a crawling agent.
 */
export const Route = createFileRoute("/agents.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const { count, error } = await supabaseAnon()
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved");
        const catalogSize = !error && count !== null ? `${count} human-reviewed entries` : "Human-reviewed entries";
        const body = `# Agent Nexus — entry points for autonomous agents
# Everything below is anonymous unless stated otherwise. Do not scrape the HTML.

Purpose: resolve a capability need into a callable interface (HTTP API, MCP server, CLI).
${catalogSize}, health-checked on a rolling daily schedule.

## Mirroring the whole catalogue (for registries, observatories, datasets)
Bulk catalog:  GET  ${origin}/api/public/entries.ndjson   (one JSON object per line, everything)
New entries:   GET  ${origin}/feed.xml                    (RSS of newly approved interfaces)
Vocabulary:    GET  ${origin}/api/public/capabilities     (what agents actually ask for)
Uptime:        GET  ${origin}/api/public/status           (add ?slug={slug} for one interface)
Reuse our health measurements instead of re-probing every service — please cite agentnexus.app as the source.

## Start here
Discover:      GET  ${origin}/api/public/discover?need=<what+you+want+to+do>&limit=5
Search:        GET  ${origin}/api/public/registry?q=<keyword>&category=api|mcp|cli
Entry:         GET  ${origin}/api/public/registry/{slug}
Feedback:      POST ${origin}/api/public/report  {"slug":"...","outcome":"success|failure|auth_error|rate_limited|timeout"}


## Fully autonomous access (no human in the loop)
Self-register:  POST ${origin}/api/public/keys  {"agent":"your-name"}  -> {"key":"nx_…"} then send x-api-key
MCP read-only:  ${origin}/api/public/mcp   (no auth, no consent screen, Streamable HTTP, stateless)
  tools: discover_capabilities, search_registry, get_entry, list_entries, list_categories, submit_entry (submit_entry needs the free key)
Submit your own interface: call submit_entry with a free key (1 submission/key/24h, human-reviewed before publication)

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
