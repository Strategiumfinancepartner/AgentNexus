import { createFileRoute } from "@tanstack/react-router";
import { agentCard } from "@/lib/agent-card";

/** A2A agent card. Agent-to-agent runtimes probe /.well-known/agent.json. */
export const Route = createFileRoute("/.well-known/agent.json")({
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
