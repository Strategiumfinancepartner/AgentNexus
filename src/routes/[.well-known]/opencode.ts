import { createFileRoute } from "@tanstack/react-router";

/**
 * OpenCode organization config (https://opencode.ai/docs/mcp-servers/).
 * OpenCode reads /.well-known/opencode for default MCP servers an
 * organization offers. Agent Nexus ships its registry MCP as an opt-in
 * remote server: listed here with enabled:false so nobody's context fills
 * up uninvited; enabling is one line in the user's opencode.json.
 */
export const Route = createFileRoute("/.well-known/opencode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = {
          $schema: "https://opencode.ai/config.json",
          mcp: {
            "agent-nexus": {
              type: "remote",
              url: `${origin}/mcp`,
              enabled: false,
            },
            "agent-nexus-anon": {
              type: "remote",
              url: `${origin}/api/public/mcp`,
              enabled: false,
            },
          },
        };
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
