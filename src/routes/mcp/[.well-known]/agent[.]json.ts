import { createFileRoute } from "@tanstack/react-router";

// /mcp/.well-known/agent.json — relative A2A probe (seen 7 Oct, Ziwei-Seat).
export const Route = createFileRoute("/mcp/.well-known/agent.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: { Location: "/.well-known/agent.json", "Cache-Control": "public, max-age=86400" },
        }),
    },
  },
});
