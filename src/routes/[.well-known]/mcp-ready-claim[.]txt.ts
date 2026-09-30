import { createFileRoute } from "@tanstack/react-router";

// SaSame MCP Readiness Passport ownership proof — exact token issued by claim_start.
// Must return the token and nothing else. Keep published: SaSame re-checks it.
export const Route = createFileRoute("/.well-known/mcp-ready-claim.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response("sasame-mcp-ready-claim:c38593ce44e8cfda0b7fc5aadc81707a4d028374", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
