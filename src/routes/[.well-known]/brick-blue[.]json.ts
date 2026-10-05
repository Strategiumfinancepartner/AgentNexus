import { createFileRoute } from "@tanstack/react-router";

// BrickBlue passport: public ed25519 key (base58) proving we own agentnexus.app.
export const Route = createFileRoute("/.well-known/brick-blue.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ key: "Gxr7ctZiMZP4nyQqB3kgFbXK2ga5wK32fvrEiyEzJHi5" }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
