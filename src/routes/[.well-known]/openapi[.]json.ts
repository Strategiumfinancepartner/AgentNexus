import { createFileRoute } from "@tanstack/react-router";

// Crawlers look for the OpenAPI document under /.well-known/ too.
export const Route = createFileRoute("/.well-known/openapi.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/openapi.json",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
