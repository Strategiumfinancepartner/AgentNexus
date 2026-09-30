import { z } from "zod";
import discoverCapabilities from "@/lib/mcp/tools/discover-capabilities";
import searchRegistry from "@/lib/mcp/tools/search-registry";
import getEntry from "@/lib/mcp/tools/get-entry";
import listCategories from "@/lib/mcp/tools/list-categories";
import listEntries from "@/lib/mcp/tools/list-entries";
import submitEntry from "@/lib/mcp/tools/submit-entry";
import { handleAgentSubmitEntry } from "@/lib/mcp/agent-submit.server";
import { enforceQuota, quotaInvite, resolveApiKey } from "@/lib/quota.server";

/**
 * Anonymous MCP surface.
 *
 * Shared by /api/public/mcp (explicit mirror) and by /mcp for unauthenticated
 * callers: directory health checkers (Glama, rokmcp, mcpbeat…) and headless
 * agents cannot click an OAuth consent screen, so handshake + read tools must
 * answer without credentials. One write is allowed on this surface:
 * submit_entry with a self-service agent key (POST /api/public/keys), landing
 * in the same human moderation queue as member submissions. Every other write
 * still requires the authenticated server.
 */

export const PROTOCOL_VERSION = "2025-06-18";

/** Revisions we can serve; older clients (Glama, Inspector 2024) abort when the
 * server answers with a revision they did not ask for. */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

export function negotiateProtocolVersion(requested: unknown): string {
  return typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
    ? requested
    : PROTOCOL_VERSION;
}

export const anonCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, x-api-key, authorization, mcp-protocol-version",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier, X-Nexus-Quota-Warning, X-Nexus-Free-Key",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type AnyTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, z.ZodTypeAny>;
  outputSchema?: Record<string, z.ZodTypeAny>;
  annotations?: Record<string, unknown>;
  handler: (input: any, ctx: any) => Promise<any> | any;
};

export const ANON_TOOLS: AnyTool[] = [
  discoverCapabilities as unknown as AnyTool,
  searchRegistry as unknown as AnyTool,
  getEntry as unknown as AnyTool,
  listCategories as unknown as AnyTool,
  listEntries as unknown as AnyTool,
  submitEntry as unknown as AnyTool,
];

function jsonSchemaFor(tool: AnyTool) {
  const shape = tool.inputSchema ?? {};
  try {
    return z.toJSONSchema(z.object(shape), { io: "input" }) as Record<string, unknown>;
  } catch {
    return { type: "object", properties: {}, additionalProperties: true };
  }
}

function outputJsonSchemaFor(tool: AnyTool) {
  const shape = tool.outputSchema;
  if (!shape) return undefined;
  try {
    return z.toJSONSchema(z.object(shape), { io: "output" }) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * tools/list is what reliability oracles (Glimind, mcpbeat, Glama) hit every
 * few minutes and they score us on latency. The payload is static, so build the
 * JSON Schemas once per isolate instead of on every handshake.
 */
let toolsListPayload: { tools: unknown[] } | null = null;

function toolsList(): { tools: unknown[] } {
  if (toolsListPayload) return toolsListPayload;
  toolsListPayload = {
    tools: ANON_TOOLS.map((t) => {
      const output = outputJsonSchemaFor(t);
      return {
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: jsonSchemaFor(t),
        ...(output ? { outputSchema: output } : {}),
        annotations: {
          ...(t.annotations ?? {}),
          readOnlyHint: (t.annotations as any)?.readOnlyHint ?? true,
        },
      };
    }),
  };
  return toolsListPayload;
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
    headers: { ...anonCors, ...headers },
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status,
    headers: anonCors,
  });
}

/** Append the pre-exhaustion quota notice (fires at 90% of the daily limit) as
 * a final text block, so agents that only read tool output still see it. */
function withQuotaNotice(result: any, warning: string | null) {
  if (!warning || !result || Array.isArray(result) || result.isError) return result;
  if (!Array.isArray(result.content)) return result;
  return { ...result, content: [...result.content, { type: "text", text: warning }] };
}

async function callTool(name: string, args: unknown, request: Request) {
  // The one write on this surface: verified against the caller's agent key
  // inside the handler (key required, 1 submission per key and per source address per 24h).
  if (name === "submit_entry") {
    try {
      return await handleAgentSubmitEntry(args, request);
    } catch (error) {
      return {
        content: [{ type: "text", text: (error as Error)?.message ?? "Tool failed" }],
        isError: true,
      };
    }
  }
  const tool = ANON_TOOLS.find((t) => t.name === name);
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

/** Methods an unauthenticated caller may use. */
export function isAnonymousMcpMethod(method: string) {
  return (
    method === "initialize" ||
    method === "server/discover" ||
    method === "ping" ||
    method === "tools/list" ||
    method.startsWith("notifications/") ||
    method === "tools/call"
  );
}

/** Handle one JSON-RPC message anonymously. `message` is the parsed body. */
export async function handleAnonymousMcpMessage(request: Request, message: any): Promise<Response> {
  const id = message?.id ?? null;
  const method = String(message?.method ?? "");

  // Notifications carry no id and expect no body.
  if (method.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: anonCors });
  }

  // Handshake methods (initialize / ping / tools/list) are what directory health
  // checkers call every hour from shared IP pools. Charging them against the
  // anonymous daily quota gets us marked "unhealthy" for free. They stay
  // protected by a generous per-hour burst limit instead; only real work
  // (tools/call) consumes the daily quota.
  const isHandshake =
    method === "initialize" ||
    method === "server/discover" ||
    method === "ping" ||
    method === "tools/list";

  let quota = {
    tier: "anon",
    limit: 0,
    used: 0,
    warning: null as string | null,
    headers: {} as Record<string, string>,
  } as {
    tier: string;
    limit: number;
    used: number;
    warning: string | null;
    headers: Record<string, string>;
  };

  if (isHandshake) {
    const { consumeRateLimit, requestActor } = await import("@/lib/telemetry.server");
    const ok = await consumeRateLimit("mcp_handshake", requestActor(request), 600, 3600);
    if (!ok) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          error: { code: -32000, message: "Too many handshakes this hour. Retry shortly." },
        }),
        { status: 429, headers: { ...anonCors, "Retry-After": "60" } },
      );
    }
  } else {
    const decision = await enforceQuota(request);
    quota = decision;
    if (!decision.allowed) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32000,
            message: `Daily quota exceeded (${decision.tier}, ${decision.limit}/day). Get a free key at /api/public/keys or upgrade at /pricing.`,
          },
        }),
        { status: 429, headers: { ...anonCors, ...decision.headers, "Retry-After": "3600" } },
      );
    }
  }

  switch (method) {
    // `server/discover` is the newer-revision protocol entry point some auditors
    // (SaSame) try before falling back to `initialize`. Same payload.
    case "server/discover":
    case "initialize": {
      // Tell the caller its allowance and the free-key path right here, in the
      // gate's presentation, so it never has to hit 90% to learn its options.
      const resolvedKey = await resolveApiKey(request).catch(() => null);
      const invite = quotaInvite(resolvedKey?.tier ?? "anon");
      return rpcResult(
        id,
        {
          // Echo back the revision the client asked for when we support it:
          // strict SDK clients abort the connection when the server answers
          // with a different protocolVersion than requested.
          protocolVersion: negotiateProtocolVersion(message?.params?.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "agent-nexus",
            title: "Agent Nexus",
            version: "1.0.0",
            description:
              "Registry of 650+ human-reviewed APIs, MCP servers and CLIs that AI agents can call, each health-checked daily on a rolling schedule, with endpoint, auth parameters, formats, rate limits and a 0-100 reliability score. Whole catalogue downloadable in one call at https://agentnexus.app/api/public/entries.ndjson; new interfaces feed at https://agentnexus.app/feed.xml.",
            websiteUrl: "https://agentnexus.app",
            icons: [
              {
                src: "https://agentnexus.app/apple-touch-icon.png",
                mimeType: "image/png",
                // MCP schema: sizes is an array of strings — a bare string makes
                // strict SDK clients (Glama's health check) reject initialize.
                sizes: ["180x180"],
              },
              {
                src: "https://agentnexus.app/favicon-512.png",
                mimeType: "image/png",
                sizes: ["512x512"],
              },
            ],
          },
          instructions:
            (invite ? `${invite}\n\n` : "") +
            "Agent Nexus (https://agentnexus.app) is a registry of 650+ human-reviewed, continuously health-checked interfaces AI agents can call: HTTP APIs, MCP servers and CLIs. Start with discover_capabilities to map a plain-language need to callable interfaces, with endpoint, auth, formats, limits and a 0-100 reliability score. list_entries pages through the whole catalogue; search_registry does keyword lookup; get_entry returns one full contract. Agent Nexus is a registry, not a proxy: call the interface yourself, then report the outcome so reliability stays honest.\n\nBulk and mirror surfaces, no auth, no scraping needed:\n- whole catalogue in one call (NDJSON): https://agentnexus.app/api/public/entries.ndjson\n- prompt-ready text catalogue: https://agentnexus.app/llms.txt\n- capability vocabulary (what agents ask for): https://agentnexus.app/api/public/capabilities\n- newly approved interfaces feed: https://agentnexus.app/feed.xml\n- uptime history: https://agentnexus.app/api/public/status\n- OpenAPI 3.1: https://agentnexus.app/openapi.json\nRegistries and observatories are welcome to mirror these surfaces; please cite agentnexus.app as the source.\n\nTo submit your own interface, call submit_entry with a free agent key: mint one via POST https://agentnexus.app/api/public/keys and send it as the x-api-key header (1 submission per key and per source address per 24h; human-reviewed).",
        },
        quota.headers,
      );
    }

    case "ping":
      return rpcResult(id, {}, quota.headers);

    case "tools/list":
      return rpcResult(id, toolsList(), quota.headers);

    case "tools/call": {
      const result = await callTool(String(message?.params?.name ?? ""), message?.params?.arguments, request);
      return rpcResult(id, withQuotaNotice(result, quota.warning ?? null), quota.headers);
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method || "(none)"}`);
  }
}

/** Full POST entry point: parse and dispatch. */
export async function handleAnonymousMcpPost(request: Request): Promise<Response> {
  let message: any;
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }
  return handleAnonymousMcpMessage(request, message);
}
