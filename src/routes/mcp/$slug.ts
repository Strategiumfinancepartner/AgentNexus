import { createFileRoute } from "@tanstack/react-router";
import { mcpHandler } from "../mcp";

// /mcp/<slug> — agents guess a per-entry MCP path (seen 1 Oct: /mcp/cosvoice).
// POST is a JSON-RPC call: serve it from our single MCP server. Reads go to
// the entry record, which already resolves near-miss slugs.
export const Route = createFileRoute("/mcp/$slug")({
  server: {
    handlers: {
      ANY: async (ctx: any) => {
        const request: Request = ctx.request;
        if (request.method === "POST") return mcpHandler(ctx);
        return new Response(null, {
          status: 307,
          headers: {
            Location: `/api/public/registry/${encodeURIComponent(ctx.params.slug)}`,
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
