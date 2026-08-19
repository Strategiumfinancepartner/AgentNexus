import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint discovery for MCP clients and crawlers that probe well-known paths
 * before attempting a connection.
 */
export const Route = createFileRoute("/.well-known/mcp.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(
          JSON.stringify(
            {
              name: "agent-nexus",
              title: "Agent Nexus",
              description:
                "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call.",
              version: "0.3.0",
              transport: "streamable-http",
              endpoint: `${origin}/mcp`,
              authorization: {
                type: "oauth2.1",
                required_for: ["submit_entry", "vote_entry", "report_invocation", "list_my_submissions"],
                anonymous_read: true,
              },
              anonymous_surfaces: {
                catalog_text: `${origin}/llms.txt`,
                search: `${origin}/api/public/registry`,
                discover: `${origin}/api/public/discover?need=`,
                report: `${origin}/api/public/report`,
              },
              documentation: `${origin}/connect`,
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
