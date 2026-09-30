import { createFileRoute } from "@tanstack/react-router";

// /mcp/server-card.json — variant guessed by MYCELIX; redirect to the canonical card.
export const Route = createFileRoute("/mcp/server-card.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 301,
          headers: {
            Location: "https://agentnexus.app/.well-known/mcp/server-card.json",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
