import { createFileRoute } from "@tanstack/react-router";

// /.well-known/monetization — bare alias probed by monetization-discovery bots.
export const Route = createFileRoute("/.well-known/monetization")({
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
