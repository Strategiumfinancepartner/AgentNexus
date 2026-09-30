import { createFileRoute } from "@tanstack/react-router";
import { agentCard } from "@/lib/agent-card";
import { signAgentCard } from "@/lib/agent-card-signature.server";

/** Newer A2A spec path (/.well-known/agent-card.json). Same payload. */
export const Route = createFileRoute("/.well-known/agent-card.json")({
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
