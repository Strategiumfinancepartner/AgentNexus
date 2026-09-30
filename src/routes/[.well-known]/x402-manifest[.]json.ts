import { createFileRoute } from "@tanstack/react-router";

// /.well-known/x402-manifest.json — alias of the canonical x402 manifest.
export const Route = createFileRoute("/.well-known/x402-manifest.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/.well-known/x402.json",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
