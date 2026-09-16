import { createFileRoute } from "@tanstack/react-router";

/**
 * UCP (Universal Commerce Protocol) discovery manifest.
 * AI shopping/commerce agents fetch /.well-known/ucp to learn what this
 * origin exposes. Agent Nexus is not a store: it declares its registry
 * capabilities (search / detail / submit / health) over MCP and REST.
 */
const ORIGIN = "https://agentnexus.app";

const body = {
  ucp: {
    version: "2026-08-25",
    services: {
      "app.agentnexus.registry": [
        {
          version: "2026-08-25",
          transport: "mcp",
          endpoint: `${ORIGIN}/api/public/mcp`,
          auth: "none",
        },
        {
          version: "2026-08-25",
          transport: "rest",
          endpoint: `${ORIGIN}/api/public`,
          auth: "none",
        },
      ],
    },
    capabilities: {
      "app.agentnexus.registry": [
        "app.agentnexus.registry.search",
        "app.agentnexus.registry.detail",
        "app.agentnexus.registry.submit",
        "app.agentnexus.registry.health",
      ],
    },
    supported_versions: {
      "2026-08-25": `${ORIGIN}/.well-known/ucp`,
    },
    contact: "mailto:support@agentnexus.app",
  },
  signing_keys: [],
};

export const Route = createFileRoute("/.well-known/ucp")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify(body, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
