import { createFileRoute } from "@tanstack/react-router";

// Some x402 verifiers probe /.well-known/x402-manifest instead of /.well-known/x402.
export const Route = createFileRoute("/.well-known/x402-manifest")({
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
