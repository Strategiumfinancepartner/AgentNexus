import { createFileRoute } from "@tanstack/react-router";

// /mcp/.well-known/owners.json — some MCP clients resolve ownership relative
// to the /mcp base path; redirect to the canonical document.
export const Route = createFileRoute("/mcp/.well-known/owners.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/.well-known/owners.json",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
