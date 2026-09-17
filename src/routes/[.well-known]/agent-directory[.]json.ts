import { createFileRoute } from "@tanstack/react-router";

/**
 * /.well-known/agent-directory.json — declares that this origin IS a directory
 * of callable agent interfaces, and where to read it without any auth.
 */
export const Route = createFileRoute("/.well-known/agent-directory.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = {
          name: "agent-nexus",
          title: "Agent Nexus",
          type: "agent-interface-directory",
          version: "0.3.0",
          description:
            "Continuously verified directory of the APIs, MCP servers and CLIs that AI agents call, with auth contract, formats, rate limits and live reliability score.",
          website: origin,
          categories: ["api", "mcp", "cli"],
          access: {
            auth: "none",
            search: `${origin}/api/public/registry`,
            discover: `${origin}/api/public/discover?need=`,
            capabilities: `${origin}/api/public/capabilities`,
            bulk_ndjson: `${origin}/api/public/entries.ndjson`,
            mcp: `${origin}/api/public/mcp`,
            authenticated_mcp: `${origin}/mcp`,
            catalog_text: `${origin}/llms.txt`,
            openapi: `${origin}/openapi.json`,
          },
          submission: {
            mcp_tool: "submit_entry",
            web: `${origin}/submit`,
            moderated: true,
          },
          contact: "mailto:support@agentnexus.app",
          updated_at: new Date().toISOString(),
        };
        return new Response(JSON.stringify(body, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
