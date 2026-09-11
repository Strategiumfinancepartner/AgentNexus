import { createFileRoute } from "@tanstack/react-router";
import { agentCard } from "@/lib/agent-card";

/** Newer A2A spec path (/.well-known/agent-card.json). Same payload. */
export const Route = createFileRoute("/.well-known/agent-card.json")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(JSON.stringify(agentCard(new URL(request.url).origin), null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        }),
    },
  },
});
