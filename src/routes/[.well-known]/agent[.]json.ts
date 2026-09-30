import { createFileRoute } from "@tanstack/react-router";
import { agentCard } from "@/lib/agent-card";
import { signAgentCard } from "@/lib/agent-card-signature.server";

/** A2A agent card. Agent-to-agent runtimes probe /.well-known/agent.json. */
export const Route = createFileRoute("/.well-known/agent.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const signed = await signAgentCard(agentCard(origin) as Record<string, unknown>, origin);
        return new Response(JSON.stringify(signed, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
