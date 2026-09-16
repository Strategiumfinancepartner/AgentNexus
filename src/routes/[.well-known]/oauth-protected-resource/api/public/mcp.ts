import { createFileRoute } from "@tanstack/react-router";

/**
 * /.well-known/oauth-protected-resource/api/public/mcp — RFC 9728 resource
 * metadata for the ANONYMOUS MCP endpoint. It requires no authentication,
 * so the document advertises the resource without authorization servers:
 * a client reading it learns there is no OAuth flow to complete.
 */
export const Route = createFileRoute("/.well-known/oauth-protected-resource/api/public/mcp")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://agentnexus.app";
        return new Response(
          JSON.stringify(
            {
              resource: `${origin}/api/public/mcp`,
              resource_name: "Agent Nexus (read-only, anonymous)",
              bearer_methods_supported: ["header"],
              scopes_supported: [],
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
