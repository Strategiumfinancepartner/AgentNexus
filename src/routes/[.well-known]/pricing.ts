import { createFileRoute } from "@tanstack/react-router";

// /.well-known/pricing — bare alias probed by pricing-discovery bots.
export const Route = createFileRoute("/.well-known/pricing")({
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
