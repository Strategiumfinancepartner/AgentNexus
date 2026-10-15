import { createFileRoute } from "@tanstack/react-router";

// mcprush.com ownership proof for the agent-nexus-mcp listing. Keep until mcprush emails the decision.
const BODY = "mcprush.com-60d641eb4d2191cc3ef5f8b4\n";

export const Route = createFileRoute("/.well-known/mcprush.com-claim.txt")({
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
