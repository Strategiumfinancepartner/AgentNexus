import { createFileRoute } from "@tanstack/react-router";

/** Payment-handler manifest probes land here; point them at the pricing document. */
export const Route = createFileRoute("/.well-known/payment-manifest")({
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
