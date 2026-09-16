import { createFileRoute } from "@tanstack/react-router";

// /.well-known/x402 — bare alias probed by payment-discovery bots.
export const Route = createFileRoute("/.well-known/x402")({
  server: {
    handlers: {
      GET: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/.well-known/pricing.json",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
