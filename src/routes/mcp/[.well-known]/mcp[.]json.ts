import { createFileRoute } from "@tanstack/react-router";

// /mcp/.well-known/mcp.json — relative probe from MCP crawlers.
export const Route = createFileRoute("/mcp/.well-known/mcp.json")({
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
