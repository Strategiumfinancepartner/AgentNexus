import { createFileRoute } from "@tanstack/react-router";

// Appside listing ownership proof (appside.build/mcp-servers/agent-nexus). Keep published.
export const Route = createFileRoute("/.well-known/appside-mcp.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          "appside-mcp=0b14943d5dd899dbdd6ec884ce1056804908fba40e660e725d242e1511c577d0",
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=300",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ),
    },
  },
});
