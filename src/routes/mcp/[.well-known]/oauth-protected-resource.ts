import { createFileRoute } from "@tanstack/react-router";

// MCP clients that resolve metadata relative to the /mcp base path.
export const Route = createFileRoute("/mcp/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      ANY: async () =>
        new Response(null, {
          status: 308,
          headers: {
            Location: "/.well-known/oauth-protected-resource/mcp",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
