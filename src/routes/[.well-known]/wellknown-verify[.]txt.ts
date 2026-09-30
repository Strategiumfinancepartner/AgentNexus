import { createFileRoute } from "@tanstack/react-router";

// wellknown.network ownership proof for both indexed records (agent-nexus, agent-nexus-agentnexus-app).
// Keep published permanently: the network re-verifies claimed records.
const BODY = [
  "wellknown-verify=wk-1kK1ywtTPZyroC_pGqWPNhqW",
  "wellknown-verify=wk-dqg5e7snnL-oyXwWcJJnD3FR",
  "",
].join("\n");

export const Route = createFileRoute("/.well-known/wellknown-verify.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(BODY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
