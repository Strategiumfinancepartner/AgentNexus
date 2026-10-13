import { createFileRoute } from "@tanstack/react-router";

// Glama ownership claim — exact JSON provided by the Glama team.
export const Route = createFileRoute("/.well-known/glama.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            $schema: "https://glama.ai/mcp/schemas/connector.json",
            claim: "glama_claim_TaDNfPrcVoBxkEqssFA-fqU6FezFZ722",
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ),
    },
  },
});
