import { createFileRoute } from "@tanstack/react-router";

// /.well-known/mcp — pointer to the MCP discovery document.
export const Route = createFileRoute("/.well-known/mcp")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/.well-known/mcp.json",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
