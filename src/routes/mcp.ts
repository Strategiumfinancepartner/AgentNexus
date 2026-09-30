// route: /mcp
// Ownership taken from @lovable.dev/mcp-js codegen: unauthenticated callers
// (directory health checkers such as Glama/rokmcp, and headless agents that
// cannot click an OAuth consent screen) must still be able to handshake and use
// the read-only tools. Authenticated calls and every write tool keep going
// through the generated OAuth-protected handler untouched.

import { createFileRoute } from "@tanstack/react-router";

import { createTanStackMcpHandler } from "@lovable.dev/mcp-js/stacks/tanstack";

import mcp from "../lib/mcp/index";
import {
  ANON_TOOLS,
  handleAnonymousMcpMessage,
  isAnonymousMcpMethod,
} from "@/lib/mcp/anonymous.server";

const authenticatedHandler = createTanStackMcpHandler(mcp, {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
});

const READ_TOOL_NAMES = new Set(ANON_TOOLS.map((t) => t.name));

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      ANY: async (ctx: any) => mcpHandler(ctx),
    },
  },
});

/** Shared by /mcp and legacy aliases such as /mcp/v1. */
export async function mcpHandler(ctx: any): Promise<Response> {
        const request: Request = ctx.request;

        // Anything with credentials, or any non-POST transport concern, is the
        // generated handler's business.
        if (request.method !== "POST" || request.headers.get("authorization")) {
          return authenticatedHandler(ctx);
        }

        const raw = await request.text();
        const replay = () =>
          authenticatedHandler({
            ...ctx,
            request: new Request(request.url, {
              method: "POST",
              headers: request.headers,
              body: raw,
            }),
          });

        let message: any;
        try {
          message = JSON.parse(raw);
        } catch {
          return replay();
        }

        const method = String(message?.method ?? "");
        if (!isAnonymousMcpMethod(method)) return replay();

        // Writes stay behind OAuth — except submit_entry from a machine: the
        // anonymous handler verifies the x-api-key itself (free key required,
        // 1 submission per key and per source address per 24h), so no OAuth dance is needed.
        const toolName = String(message?.params?.name ?? "");
        if (
          method === "tools/call" &&
          !READ_TOOL_NAMES.has(toolName) &&
          !(toolName === "submit_entry" && !request.headers.get("authorization"))
        ) {
          return replay();
        }

        // A malformed but JSON-shaped payload (crawlers send {"ping":1} or a
        // bare array) must come back as a JSON-RPC error, never a 500 page.
        try {
          return await handleAnonymousMcpMessage(request, message);
        } catch (error) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: message?.id ?? null,
              error: {
                code: -32600,
                message: "Invalid request",
                data: {
                  hint: "Send a JSON-RPC 2.0 object: {\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}",
                  docs: "https://agentnexus.app/connect",
                  detail: error instanceof Error ? error.message : String(error),
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
}
