import { createFileRoute } from "@tanstack/react-router";

// /.well-known/payment — bare alias probed by payment-discovery bots.
export const Route = createFileRoute("/.well-known/payment")({
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
