import { createFileRoute } from "@tanstack/react-router";
import {
  anonCors,
  handleAnonymousMcpPost,
  mcpDiscoveryDocument,
} from "@/lib/mcp/anonymous.server";

/**
 * Anonymous, read-only MCP endpoint (explicit mirror of /mcp for unauthenticated
 * callers). Shared implementation lives in @/lib/mcp/anonymous.server.
 */

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: anonCors }),

      GET: async ({ request }) => {
        // Streamable HTTP spec: a server that offers no server-initiated SSE
        // stream MUST answer an event-stream GET with 405, not a JSON body.
        // Scanners (Glama, RNWY) hang or report a broken handshake otherwise.
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/event-stream") && !accept.includes("application/json")) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message:
                  "This server is stateless: no server-initiated SSE stream. POST JSON-RPC to this same URL.",
              },
              id: null,
            }),
            { status: 405, headers: { ...anonCors, Allow: "POST, OPTIONS" } },
          );
        }
        return mcpDiscoveryDocument(request, "/api/public/mcp");
      },


      POST: async ({ request }) => handleAnonymousMcpPost(request),
    },
  },
});
