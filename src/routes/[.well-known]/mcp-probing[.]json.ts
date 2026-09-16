import { createFileRoute } from "@tanstack/react-router";

/**
 * Probing policy file (vouch.tools probing standard): tells census and
 * measurement crawlers like Vouch-Census what is allowed on this server.
 */
export const Route = createFileRoute("/.well-known/mcp-probing.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify(
            {
              server: "app.agentnexus/agent-nexus",
              probing: "allowed",
              scope: ["initialize", "tools/list"],
              rate_limit: "60 requests per hour per client",
              contact: "mailto:support@agentnexus.app",
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
