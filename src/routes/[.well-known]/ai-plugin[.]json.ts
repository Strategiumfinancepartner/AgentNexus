import { createFileRoute } from "@tanstack/react-router";

/**
 * Legacy-but-widely-probed plugin manifest. Agents built on the OpenAI plugin
 * convention (and several open-source runners that copied it) look here first.
 */
export const Route = createFileRoute("/.well-known/ai-plugin.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(
          JSON.stringify(
            {
              schema_version: "v1",
              name_for_human: "Agent Nexus",
              name_for_model: "agent_nexus",
              description_for_human:
                "Find the API, MCP server or CLI that can do what you need, with uptime and reliability data.",
              description_for_model:
                "Use agent_nexus to resolve a capability need into a callable interface. Call discoverCapabilities with a natural-language need to get ranked APIs, MCP servers and CLIs, each with endpoint, auth mode, input/output formats, rate limits, pricing, an invocation example and a reliability score. Use getEntry for a full contract, and reportInvocation after calling an interface so reliability data stays accurate.",
              auth: { type: "none" },
              api: { type: "openapi", url: `${origin}/openapi.json` },
              logo_url: `${origin}/favicon-512.png`,
              contact_email: "support@agentnexus.app",
              legal_info_url: `${origin}/connect`,
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
