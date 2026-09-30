import { createFileRoute } from "@tanstack/react-router";
import {
  ANON_TOOLS,
  PROTOCOL_VERSION,
  anonCors,
  handleAnonymousMcpPost,
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
        return new Response(
          JSON.stringify(
            {
              name: "agent-nexus-read",
              title: "Agent Nexus (read-only)",
              transport: "streamable-http",
              protocolVersion: PROTOCOL_VERSION,
              authentication: "none",
              endpoint: `${new URL(request.url).origin}/api/public/mcp`,
              tools: ANON_TOOLS.map((t) => t.name),
              note: "Anonymous read-only mirror, stateless: POST JSON-RPC here, no session id and no SSE stream required. Writes require the authenticated server at /mcp.",
            },
            null,
            2,
          ),
          { status: 200, headers: anonCors },
        );
      },


      POST: async ({ request }) => handleAnonymousMcpPost(request),
    },
  },
});
