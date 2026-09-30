import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_JWK } from "@/lib/agent-card-signature.server";

/** JWKS for the agent-card JWS (`jku` on the card's protected header). */
export const Route = createFileRoute("/.well-known/jwks.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ keys: [PUBLIC_JWK] }, null, 2), {
          headers: {
            "Content-Type": "application/jwk-set+json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
