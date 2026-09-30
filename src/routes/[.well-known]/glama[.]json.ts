import { createFileRoute } from "@tanstack/react-router";

// Glama ownership claim — exact JSON provided by the Glama team.
export const Route = createFileRoute("/.well-known/glama.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            $schema: "https://glama.ai/mcp/schemas/connector.json",
            claim: "glama_claim_zyj4JJpWWMdut8yPIlp7gBzVtDUj7q_6",
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
