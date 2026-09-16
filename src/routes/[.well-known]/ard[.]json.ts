import { createFileRoute } from "@tanstack/react-router";

/**
 * Agentic Resource Discovery (ARD) manifest — v0.91 (https://agenticresourcediscovery.org/spec/).
 * Successor of /.well-known/ai-catalog.json: same resources, ARD envelope.
 */
export const Route = createFileRoute("/.well-known/ard.json")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = {
          specVersion: "0.91",
          updated: new Date().toISOString().slice(0, 10),
          host: {
            name: "Agent Nexus",
            operator: "BrainPath.io",
            description:
              "Verified registry of APIs, MCP servers and CLIs that AI agents can discover and call, with real health probes and machine-readable contracts.",
            url: origin,
            contact: "mailto:support@agentnexus.app",
          },
          entries: [
            {
              identifier: "urn:air:agentnexus.app:server:agent-nexus",
              displayName: "Agent Nexus Registry MCP",
              type: "application/mcp-server+json",
              url: `${origin}/api/public/mcp`,
              description:
                "Search and inspect the registry over MCP (Streamable HTTP), no key required.",
              capabilities: [
                "discover_capabilities",
                "search_registry",
                "get_entry",
                "list_categories",
              ],
              representativeQueries: [
                "find an MCP server for payments",
                "search the registry for a weather API",
                "get details for the stripe-mcp entry",
                "list available API categories",
              ],
            },
            {
              identifier: "urn:air:agentnexus.app:server:agent-nexus-auth",
              displayName: "Agent Nexus Registry MCP (authenticated)",
              type: "application/mcp-server+json",
              url: `${origin}/mcp`,
              description:
                "Same tools with OAuth-authenticated access and higher quotas.",
              capabilities: [
                "discover_capabilities",
                "search_registry",
                "get_entry",
                "list_categories",
              ],
            },
            {
              identifier: "urn:air:agentnexus.app:api:discover",
              displayName: "Capability discovery API",
              type: "application/openapi+json",
              url: `${origin}/api/public/discover`,
              description:
                "Natural-language capability discovery across the registry.",
              capabilities: ["discover"],
            },
            {
              identifier: "urn:air:agentnexus.app:api:registry",
              displayName: "Registry browse API",
              type: "application/openapi+json",
              url: `${origin}/api/public/registry`,
              description: "Browse and filter registry entries.",
              capabilities: ["list", "filter", "get"],
            },
            {
              identifier: "urn:air:agentnexus.app:dataset:entries",
              displayName: "Registry dump (NDJSON)",
              type: "application/x-ndjson",
              url: `${origin}/api/public/entries.ndjson`,
              description: "Full registry dump, one JSON entry per line.",
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
