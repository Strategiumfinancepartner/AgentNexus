/**
 * Capability probes — the layer above a plain liveness ping.
 *
 * An HTTP 200 only proves a host answers. A capability probe tries to prove the
 * interface actually exposes what it claims: MCP servers are asked for their
 * tool list over JSON-RPC, HTTP APIs must answer with a machine-readable
 * contract (JSON) or an explicit auth challenge, which is the correct behaviour
 * for a gated endpoint.
 */

const TIMEOUT_MS = 10_000;

export type CapabilityProbe = {
  probeable: boolean;
  ok: boolean | null;
  detail: string;
  tools: string[];
};

const notProbeable = (detail: string): CapabilityProbe => ({
  probeable: false,
  ok: null,
  detail,
  tools: [],
});

function isHttp(endpoint: string) {
  return /^https?:\/\//i.test(endpoint.trim());
}

/** `{baseId}` / `<project-ref>` style endpoints are templates, not callable URLs. */
export function hasPlaceholder(endpoint: string) {
  return /[{<][^{}<>\s]+[}>]/.test(endpoint);
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** JSON-RPC `tools/list` against a streamable-HTTP or SSE MCP endpoint. */
async function probeMcp(endpoint: string): Promise<CapabilityProbe> {
  const call = (body: unknown, signal: AbortSignal) =>
    fetch(endpoint, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "user-agent": "AgentNexus-CapabilityProbe/1.0",
      },
      body: JSON.stringify(body),
    });

  try {
    return await withTimeout(async (signal) => {
      await call(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "agent-nexus-probe", version: "1.0" },
          },
        },
        signal,
      ).catch(() => null);

      const response = await call({ jsonrpc: "2.0", id: 2, method: "tools/list" }, signal);
      const text = (await response.text()).slice(0, 200_000);

      if (response.status === 401 || response.status === 403) {
        return {
          probeable: true,
          ok: true,
          detail: `Reachable, authentication required (HTTP ${response.status})`,
          tools: [],
        };
      }

      const payload = parseJsonRpc(text);
      const tools = extractToolNames(payload);
      if (tools.length > 0) {
        return {
          probeable: true,
          ok: true,
          detail: `tools/list returned ${tools.length} tool${tools.length > 1 ? "s" : ""}`,
          tools,
        };
      }
      if (payload && typeof payload === "object" && "error" in payload) {
        const message = String(
          (payload as { error?: { message?: string } }).error?.message ?? "unknown",
        );
        // A session/initialize requirement is correct MCP behaviour, not a failure.
        if (/session|initialize|not initialized/i.test(message)) {
          return {
            probeable: true,
            ok: true,
            detail: "Reachable, MCP session handshake required before tools/list",
            tools: [],
          };
        }
        return {
          probeable: true,
          ok: false,
          detail: `JSON-RPC error: ${message.slice(0, 160)}`,
          tools: [],
        };
      }
      if (response.status === 404 || response.status === 405) {
        return {
          probeable: true,
          ok: null,
          detail: `Endpoint answered HTTP ${response.status} to tools/list — transport may differ (SSE vs streamable HTTP)`,
          tools: [],
        };
      }
      return {
        probeable: true,
        ok: false,
        detail: `No tool list in response (HTTP ${response.status})`,
        tools: [],
      };
    });
  } catch (error) {
    return {
      probeable: true,
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 200) : "Probe failed",
      tools: [],
    };
  }
}

/** Accepts a plain JSON body or an SSE `data:` framed JSON-RPC response. */
function parseJsonRpc(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  for (const line of trimmed.split("\n")) {
    const value = line.trim();
    if (!value.startsWith("data:")) continue;
    try {
      return JSON.parse(value.slice(5).trim());
    } catch {
      // keep scanning further SSE frames
    }
  }
  return null;
}

function extractToolNames(payload: unknown): string[] {
  const tools = (payload as { result?: { tools?: unknown } } | null)?.result?.tools;
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => (tool as { name?: unknown })?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0)
    .slice(0, 60);
}

/** An HTTP API is "capability ok" when it answers a machine contract or an auth challenge. */
async function probeHttpApi(endpoint: string): Promise<CapabilityProbe> {
  try {
    return await withTimeout(async (signal) => {
      const response = await fetch(endpoint, {
        method: "GET",
        redirect: "follow",
        signal,
        headers: { accept: "application/json", "user-agent": "AgentNexus-CapabilityProbe/1.0" },
      });
      const contentType = (response.headers.get("content-type") ?? "").toLowerCase();

      if (response.status === 401 || response.status === 403) {
        return {
          probeable: true,
          ok: true,
          detail: `Auth-gated as documented (HTTP ${response.status})`,
          tools: [],
        };
      }
      if (response.status >= 500) {
        return { probeable: true, ok: false, detail: `Server error HTTP ${response.status}`, tools: [] };
      }
      if (response.status === 404) {
        return { probeable: true, ok: false, detail: "Endpoint not found (HTTP 404)", tools: [] };
      }
      if (contentType.includes("json")) {
        return {
          probeable: true,
          ok: true,
          detail: `JSON contract confirmed (HTTP ${response.status})`,
          tools: [],
        };
      }
      return {
        probeable: true,
        ok: false,
        detail: `Answered HTTP ${response.status} with ${contentType || "unknown content type"}, not JSON`,
        tools: [],
      };
    });
  } catch (error) {
    return {
      probeable: true,
      ok: false,
      detail: error instanceof Error ? error.message.slice(0, 200) : "Probe failed",
      tools: [],
    };
  }
}

export async function probeCapabilities(entry: {
  category: string;
  endpoint: string;
}): Promise<CapabilityProbe> {
  const endpoint = entry.endpoint.trim();
  if (entry.category === "cli") {
    return notProbeable("CLI interfaces are validated locally, not over the network");
  }
  if (!isHttp(endpoint)) {
    return notProbeable("Locally launched interface (stdio) — not remotely probeable");
  }
  return entry.category === "mcp" ? probeMcp(endpoint) : probeHttpApi(endpoint);
}
