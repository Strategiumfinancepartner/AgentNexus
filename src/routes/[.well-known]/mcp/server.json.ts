import { createFileRoute } from "@tanstack/react-router";

// /.well-known/mcp/server.json — canonical manifest lives at /server.json.
export const Route = createFileRoute("/.well-known/mcp/server.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/server.json",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
