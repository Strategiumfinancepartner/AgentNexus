import { createFileRoute } from "@tanstack/react-router";

// /.well-known/payments — bare alias probed by payment-discovery bots.
export const Route = createFileRoute("/.well-known/payments")({
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
