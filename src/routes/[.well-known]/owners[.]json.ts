import { createFileRoute } from "@tanstack/react-router";

/**
 * Owner contact file read by VerifyMCP-OwnersBot and similar registry
 * observers: who operates this MCP server and how to reach them.
 */
export const Route = createFileRoute("/.well-known/owners.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify(
            {
              server: "app.agentnexus/agent-nexus",
              operators: [
                {
                  name: "BrainPath.io",
                  role: "owner",
                  email: "support@agentnexus.app",
                  url: "https://agentnexus.app",
                },
              ],
              endpoints: [
                "https://agentnexus.app/mcp",
                "https://agentnexus.app/api/public/mcp",
              ],
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
