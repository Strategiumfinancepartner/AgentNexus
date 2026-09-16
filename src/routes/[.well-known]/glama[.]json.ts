import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/glama.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify(
            {
              $schema: "https://glama.ai/schemas/server.json",
              name: "app.agentnexus/agent-nexus",
              title: "Agent Nexus",
              description:
                "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call, with live health checks and reliability history.",
              url: "https://agentnexus.app",
              endpoints: [
                {
                  transport: "streamable-http",
                  url: "https://agentnexus.app/mcp",
                  auth: "oauth2.1",
                },
                {
                  transport: "streamable-http",
                  url: "https://agentnexus.app/api/public/mcp",
                  auth: "none",
                },
              ],
              tools: [
                "discover_capabilities",
                "search_registry",
                "get_entry",
                "list_categories",
              ],
              badge:
                "https://glama.ai/mcp/servers/app.agentnexus/agent-nexus/badge",
              profile: "https://glama.ai/mcp/servers?query=author%3Aagent-nexus",
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ),
    },
  },
});
