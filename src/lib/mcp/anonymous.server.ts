import { z } from "zod";
import discoverCapabilities from "@/lib/mcp/tools/discover-capabilities";
import searchRegistry from "@/lib/mcp/tools/search-registry";
import getEntry from "@/lib/mcp/tools/get-entry";
import listCategories from "@/lib/mcp/tools/list-categories";
import listEntries from "@/lib/mcp/tools/list-entries";
import submitEntry from "@/lib/mcp/tools/submit-entry";
import { handleAgentSubmitEntry } from "@/lib/mcp/agent-submit.server";
import { enforceQuota } from "@/lib/quota.server";
import { MCP_INSTRUCTIONS } from "./instructions";

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
          title: t.title,
          // OpenAI's app review requires all three hints as explicit booleans.
          readOnlyHint: (t.annotations as any)?.readOnlyHint ?? true,
          destructiveHint: (t.annotations as any)?.destructiveHint ?? false,
          openWorldHint:
            (t.annotations as any)?.openWorldHint ?? t.name === "submit_entry",
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
    headers: { ...anonCors, ...(status >= 400 ? { "x-nexus-error-detail": `MCP JSON-RPC rejection: code=${code}` } : {}) },
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

/** Reject JSON-shaped probes before dispatching or consuming quota. */
export function isValidMcpRequest(message: unknown): boolean {
  if (!message || typeof message !== "object" || Array.isArray(message)) return false;
  const value = message as Record<string, unknown>;
  return value['jsonrpc'] === "2.0" && typeof value['method'] === "string" && value['method'].length > 0
    && (value['id'] === undefined || typeof value['id'] === "string" || (typeof value['id'] === "number" && Number.isFinite(value['id'])))
    && (value['params'] === undefined || (value['params'] !== null && typeof value['params'] === "object" && !Array.isArray(value['params'])));
}

/** Handle one JSON-RPC message anonymously. `message` is the parsed body. */
export async function handleAnonymousMcpMessage(request: Request, message: any): Promise<Response> {
  if (!isValidMcpRequest(message)) {
    return rpcError(null, -32600, "Invalid request: send a JSON-RPC 2.0 object with a method", 400);
  }
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
      const isDiscover = method === "server/discover";
      const built = {
          // Echo back the revision the client asked for when we support it:
          // strict SDK clients abort the connection when the server answers
          // with a different protocolVersion than requested.
          protocolVersion: negotiateProtocolVersion(message?.params?.protocolVersion),
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: "agent-nexus",
            title: "Agent Nexus",
            version: "1.1.0",
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
          instructions: MCP_INSTRUCTIONS,
        };
      // MCP 2026-07-28 `server/discover` has its own result shape (SEP-2575):
      // OpenAI's tool scan rejects the initialize shape here.
      const payload = isDiscover
        ? {
            resultType: "complete",
            supportedVersions: ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"],
            capabilities: built.capabilities,
            instructions: built.instructions,
            _meta: { "io.modelcontextprotocol/serverInfo": built.serverInfo },
            ttlMs: 3600000,
            cacheScope: "public",
          }
        : built;
      return rpcResult(id, payload, quota.headers);
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

/**
 * Discovery document answered to plain GET/HEAD probes on the MCP endpoints.
 * Directory crawlers and onboarding probes (Glama, Taifoon, RNWY…) test the
 * URL with a GET before attempting a JSON-RPC handshake; a 401/400 there reads
 * as "server down" in their benches, so we answer 200 with connection
 * instructions instead.
 */
export function mcpDiscoveryDocument(request: Request, endpointPath: string): Response {
  const origin = new URL(request.url).origin;
  return new Response(
    JSON.stringify(
      {
        name: "agent-nexus-read",
        title: "Agent Nexus (read-only)",
        transport: "streamable-http",
        protocolVersion: PROTOCOL_VERSION,
        supportedProtocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
        authentication: "none for read tools; submit_entry requires a free agent key (x-api-key header)",
        endpoint: `${origin}${endpointPath}`,
        tools: ANON_TOOLS.map((t) => t.name),
        howToConnect: {
          step1: `POST ${origin}${endpointPath} with {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${PROTOCOL_VERSION}","capabilities":{},"clientInfo":{"name":"your-agent","version":"1.0"}}}`,
          step2: 'Then call tools/list, and tools/call with e.g. {"name":"search_registry","arguments":{"query":"send email"}}',
        },
        freeKey: `POST ${origin}/api/public/keys {"agent":"your-name"} raises you from 100 to 1000 calls/day, no account needed.`,
        note: "Stateless server: POST JSON-RPC here, no session id and no SSE stream required.",
      },
      null,
      2,
    ),
    { status: 200, headers: anonCors },
  );
}

/** Full POST entry point: parse and dispatch. */
export async function handleAnonymousMcpPost(request: Request): Promise<Response> {
  let message: any;
  try {
    message = await request.json();
  } catch {
    return rpcError(null, -32700, 'Parse error: POST a JSON-RPC 2.0 object, e.g. {"jsonrpc":"2.0","id":1,"method":"tools/list"}. Connect: https://agentnexus.app/connect', 400);
  }
  return handleAnonymousMcpMessage(request, message);
}
