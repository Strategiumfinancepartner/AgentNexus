import { createFileRoute } from "@tanstack/react-router";

/**
 * server.json — the manifest format used by the official MCP registry and by
 * third-party directories (Smithery, Glama, mcp.so) when listing a remote server.
 */
export const Route = createFileRoute("/server.json")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://agentnexus.app";
        return new Response(
          JSON.stringify(
            {
              $schema:
                "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
              name: "app.agentnexus/agent-nexus",
              description:
                "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call. Maps a natural-language need to a callable interface with its auth contract, formats, rate limits and live reliability score.",
              version: "0.3.0",
              websiteUrl: origin,
              remotes: [
                {
                  type: "streamable-http",
                  url: `${origin}/mcp`,
                },
              ],
              packages: [],
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
