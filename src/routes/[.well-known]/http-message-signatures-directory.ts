import { createFileRoute } from "@tanstack/react-router";

/**
 * HTTP Message Signatures key directory
 * (draft-meunier-http-message-signatures-directory / Web Bot Auth).
 *
 * Clients (bots) host this path on their own domain to advertise signing keys.
 * Agent Nexus does not cryptographically sign its outbound requests, so we
 * serve an empty JWKS directory instead of a 404: an explicit, well-formed
 * "no keys published" answer.
 */
export const Route = createFileRoute("/.well-known/http-message-signatures-directory")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ keys: [] }), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
