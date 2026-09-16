import { createFileRoute } from "@tanstack/react-router";

/**
 * /.well-known/mcp/server-card.json — machine-readable card describing the
 * MCP server: endpoints, transport, auth model, tools and pointers to the
 * full manifests. Probed by MCP observatories and clients during discovery.
 */
export const Route = createFileRoute("/.well-known/mcp/server-card.json")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://agentnexus.app";
        return new Response(
          JSON.stringify(
            {
              name: "agent-nexus",
              title: "Agent Nexus",
              description:
                "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call. Maps a natural-language need to a callable interface with its auth contract, formats, rate limits and live reliability score.",
              version: "0.3.0",
              websiteUrl: origin,
              mcp: {
                endpoint: `${origin}/mcp`,
                transport: "streamable-http",
                auth: {
                  type: "oauth2.1",
                  required_for: ["submit_entry", "vote_entry", "report_invocation", "list_my_submissions"],
                  anonymous_read: true,
                },
                anonymous_endpoint: `${origin}/api/public/mcp`,
              },
              capabilities: {
                tools: { listChanged: false },
                prompts: { listChanged: false },
                resources: { listChanged: false },
              },
              tools: ["discover_capabilities", "search_registry", "get_entry", "list_categories"],
              links: {
                manifest: `${origin}/server.json`,
                discovery: `${origin}/.well-known/mcp.json`,
                openapi: `${origin}/openapi.json`,
                llms: `${origin}/llms.txt`,
                agents: `${origin}/agents.txt`,
                status: `${origin}/api/public/status`,
              },
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
