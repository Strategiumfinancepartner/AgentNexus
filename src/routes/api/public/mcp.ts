import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import discoverCapabilities from "@/lib/mcp/tools/discover-capabilities";
import searchRegistry from "@/lib/mcp/tools/search-registry";
import getEntry from "@/lib/mcp/tools/get-entry";
import listCategories from "@/lib/mcp/tools/list-categories";
import { enforceQuota } from "@/lib/quota.server";

/**
 * Anonymous, read-only MCP endpoint.
 *
 * The authenticated server at /mcp requires an OAuth consent screen, which a
 * fully autonomous agent cannot click through. This mirror exposes only the
 * read tools — every one of them backed by the `anon` Supabase role and the
 * public "approved entries" policy — so any MCP client connects headlessly.
 * Writes (submit, vote, report ownership) stay on the authenticated server.
 *
 * Stateless Streamable HTTP: each POST is a self-contained JSON-RPC call, so
 * no session id is required.
 */

const PROTOCOL_VERSION = "2025-06-18";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, x-api-key, authorization, mcp-protocol-version",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type AnyTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, z.ZodTypeAny>;
  annotations?: Record<string, unknown>;
  handler: (input: any, ctx: any) => Promise<any> | any;
};

const TOOLS: AnyTool[] = [
  discoverCapabilities as unknown as AnyTool,
  searchRegistry as unknown as AnyTool,
  getEntry as unknown as AnyTool,
  listCategories as unknown as AnyTool,
];

function jsonSchemaFor(tool: AnyTool) {
  const shape = tool.inputSchema ?? {};
  try {
    return z.toJSONSchema(z.object(shape), { io: "input" }) as Record<string, unknown>;
  } catch {
    return { type: "object", properties: {}, additionalProperties: true };
  }
}

/** No caller identity: read tools must never depend on one. */
const anonContext = {
  isAuthenticated: () => false,
  getUserId: () => null,
  getUserEmail: () => null,
  getClientId: () => null,
  getClaims: () => ({}),
  getToken: () => null,
  progress: async () => undefined,
  signal: undefined as AbortSignal | undefined,
};

function rpcResult(id: unknown, result: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { ...cors, ...headers },
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status,
    headers: cors,
  });
}

async function callTool(name: string, args: unknown) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return { content: [{ type: "text", text: `Unknown tool "${name}"` }], isError: true };
  }
  const parsed = z.object(tool.inputSchema ?? {}).safeParse(args ?? {});
  if (!parsed.success) {
    return {
      content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
      isError: true,
    };
  }
  try {
    return await tool.handler(parsed.data, anonContext);
  } catch (error) {
    return {
      content: [{ type: "text", text: (error as Error)?.message ?? "Tool failed" }],
      isError: true,
    };
  }
}

export const Route = createFileRoute("/api/public/mcp")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      GET: async ({ request }) =>
        new Response(
          JSON.stringify(
            {
              name: "agent-nexus-read",
              title: "Agent Nexus (read-only)",
              transport: "streamable-http",
              protocolVersion: PROTOCOL_VERSION,
              authentication: "none",
              endpoint: `${new URL(request.url).origin}/api/public/mcp`,
              tools: TOOLS.map((t) => t.name),
              note: "Anonymous read-only mirror. Writes require the authenticated server at /mcp.",
            },
            null,
            2,
          ),
          { status: 200, headers: cors },
        ),

      POST: async ({ request }) => {
        let message: any;
        try {
          message = await request.json();
        } catch {
          return rpcError(null, -32700, "Parse error", 400);
        }

        const id = message?.id ?? null;
        const method = String(message?.method ?? "");

        // Notifications carry no id and expect no body.
        if (method.startsWith("notifications/")) {
          return new Response(null, { status: 202, headers: cors });
        }

        const quota = await enforceQuota(request);
        if (!quota.allowed) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32000,
                message: `Daily quota exceeded (${quota.tier}, ${quota.limit}/day). Get a free key at /api/public/keys or upgrade at /pricing.`,
              },
            }),
            { status: 429, headers: { ...cors, ...quota.headers } },
          );
        }

        switch (method) {
          case "initialize":
            return rpcResult(
              id,
              {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: "agent-nexus-read", version: "1.0.0" },
                instructions:
                  "Read-only Agent Nexus registry. Start with discover_capabilities to map a plain-language need to callable APIs, MCP servers and CLIs, with endpoint, auth, formats, limits and reliability. No authentication required.",
              },
              quota.headers,
            );

          case "ping":
            return rpcResult(id, {}, quota.headers);

          case "tools/list":
            return rpcResult(
              id,
              {
                tools: TOOLS.map((t) => ({
                  name: t.name,
                  title: t.title,
                  description: t.description,
                  inputSchema: jsonSchemaFor(t),
                  annotations: { ...(t.annotations ?? {}), readOnlyHint: true },
                })),
              },
              quota.headers,
            );

          case "tools/call": {
            const result = await callTool(
              String(message?.params?.name ?? ""),
              message?.params?.arguments,
            );
            return rpcResult(id, result, quota.headers);
          }

          default:
            return rpcError(id, -32601, `Method not found: ${method || "(none)"}`);
        }
      },
    },
  },
});
