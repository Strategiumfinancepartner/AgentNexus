import { createFileRoute } from "@tanstack/react-router";

// /mcp/.well-known/agent-card.json — relative A2A probe.
export const Route = createFileRoute("/mcp/.well-known/agent-card.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: { Location: "/.well-known/agent-card.json", "Cache-Control": "public, max-age=86400" },
        }),
    },
  },
});
