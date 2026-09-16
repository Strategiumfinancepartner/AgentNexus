import { createFileRoute } from "@tanstack/react-router";

/**
 * ARD / AI Catalog manifest (https://agenticresourcediscovery.org/ai_catalog_spec/).
 * Declares what this domain offers to autonomous agents and where to reach it.
 */
export const Route = createFileRoute("/.well-known/ai-catalog.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = {
          version: "1.0",
          updated: new Date().toISOString().slice(0, 10),
          provider: {
            name: "Agent Nexus",
            description:
              "Verified registry of APIs, MCP servers and CLIs that AI agents can discover and call, with real health probes and machine-readable contracts.",
            url: origin,
            contact: "mailto:support@agentnexus.app",
            legal_entity: "BrainPath.io",
          },
          resources: [
            {
              type: "mcp_server",
              name: "agent-nexus",
              description: "Search and inspect the registry over MCP (Streamable HTTP).",
              url: `${origin}/api/public/mcp`,
              transport: "streamable-http",
              auth: "none",
              tools: [
                "discover_capabilities",
                "search_registry",
                "get_entry",
                "list_categories",
              ],
            },
            {
              type: "mcp_server",
              name: "agent-nexus-authenticated",
              description: "Same tools with OAuth-authenticated access and higher quotas.",
              url: `${origin}/mcp`,
              transport: "streamable-http",
              auth: "oauth2",
            },
            {
              type: "rest_api",
              name: "discover",
              description: "Natural-language capability discovery across the registry.",
              url: `${origin}/api/public/discover`,
              openapi: `${origin}/openapi.json`,
              auth: "api_key_optional",
            },
            {
              type: "rest_api",
              name: "registry",
              description: "Browse and filter registry entries.",
              url: `${origin}/api/public/registry`,
              openapi: `${origin}/openapi.json`,
              auth: "api_key_optional",
            },
            {
              type: "dataset",
              name: "entries.ndjson",
              description: "Full registry dump, one JSON entry per line.",
              url: `${origin}/api/public/entries.ndjson`,
              format: "application/x-ndjson",
            },
          ],
          onboarding: {
            self_service_api_key: {
              method: "POST",
              url: `${origin}/api/public/keys`,
              description:
                "Agents can request a free API key without human intervention.",
            },
          },
          pricing: `${origin}/.well-known/pricing.json`,
          documentation: `${origin}/llms.txt`,
          agents_txt: `${origin}/agents.txt`,
          policies: {
            terms: `${origin}/terms`,
            privacy: `${origin}/privacy`,
            refunds: `${origin}/refunds`,
          },
        };
        return new Response(JSON.stringify(body, null, 2), {
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
