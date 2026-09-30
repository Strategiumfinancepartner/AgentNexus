import { createFileRoute } from "@tanstack/react-router";

// MCP clients that resolve the authorization server relative to /mcp.
export const Route = createFileRoute("/mcp/.well-known/oauth-authorization-server")({
  server: {
    handlers: {
      ANY: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/.well-known/oauth-authorization-server",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
