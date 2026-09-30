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

/**
 * A probe runs from our own server, so a listed endpoint pointing at a loopback,
 * private, link-local or cloud-metadata address would turn the probe into an
 * internal-network request (SSRF) whose response is echoed into a public entry.
 * Only public, name-or-public-IP http(s) targets are probeable.
 */
export function isPublicHttpTarget(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  // Embedded credentials are never needed for a probe and are a classic way to
  // confuse host parsing.
  if (parsed.username || parsed.password) return false;

  let host = parsed.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home.arpa") ||
    host === "metadata.google.internal" ||
    host === "instance-data"
  ) {
    return false;
  }

  // IPv4 literal
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if ([a, Number(v4[3]), Number(v4[4])].some((n) => n > 255) || b > 255) return false;
    if (a === 0 || a === 10 || a === 127) return false; // this-network, private, loopback
    if (a === 169 && b === 254) return false; // link-local incl. cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return false; // private
    if (a === 192 && b === 168) return false; // private
    if (a === 192 && b === 0) return false; // 192.0.0.0/24 protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
    if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
    if (a >= 224) return false; // multicast + reserved
    return true;
  }

  // Any other numeric / IPv6-ish literal: allow only clearly public IPv6.
  if (host.includes(":")) {
    if (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fe80") ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("::ffff:") ||
      host.startsWith("64:ff9b:")
    ) {
      return false;
    }
    return true;
  }

  // Decimal/octal/hex-encoded IPv4 forms (e.g. 2130706433) bypass the checks above.
  if (/^[0-9]+$/.test(host) || /^0x[0-9a-f]+$/.test(host)) return false;

  // Must look like a real DNS name.
  return host.includes(".") && !host.endsWith(".");
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
      // No redirect following: a hop could land on an internal address.
      redirect: "manual",
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
      // Redirects are followed by hand so each hop is re-checked: `follow` would
      // let a public host bounce the probe onto an internal address.
      let current = endpoint;
      let response: Response | null = null;
      for (let hop = 0; hop < 5; hop += 1) {
        if (!isPublicHttpTarget(current)) {
          return {
            probeable: false,
            ok: null,
            detail: "Endpoint resolves to a non-public address — not probed",
            tools: [],
          };
        }
        response = await fetch(current, {
          method: "GET",
          redirect: "manual",
          signal,
          headers: { accept: "application/json", "user-agent": "AgentNexus-CapabilityProbe/1.0" },
        });
        if (response.status < 300 || response.status >= 400) break;
        const location = response.headers.get("location");
        if (!location) break;
        current = new URL(location, current).toString();
        response = null;
      }
      if (!response) {
        return { probeable: true, ok: null, detail: "Too many redirects to verify", tools: [] };
      }
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
      // A REST base path commonly has no GET handler: the host answered, so the
      // interface is reachable, but the contract itself stays unverified.
      if (response.status === 404 || response.status === 405) {
        return {
          probeable: true,
          ok: null,
          detail: `Base path answered HTTP ${response.status} — no GET contract at the root, call a documented operation`,
          tools: [],
        };
      }
      if (contentType.includes("json")) {
        return {
          probeable: true,
          ok: true,
          detail: `JSON contract confirmed (HTTP ${response.status})`,
          tools: [],
        };
      }
      // Plenty of legitimate machine interfaces answer XML, CSV, NDJSON or plain
      // text (arXiv, Stack Exchange, GTFS feeds, OpenStreetMap...). Demanding
      // JSON flagged them as broken while they served their documented contract,
      // so any structured, non-HTML payload counts as a confirmed contract.
      if (/(xml|csv|ndjson|jsonl|yaml|text\/plain|application\/x-ndjson|rss|atom|protobuf|octet-stream)/.test(contentType)) {
        return {
          probeable: true,
          ok: true,
          detail: `Non-JSON machine contract confirmed (HTTP ${response.status}, ${contentType.split(";")[0]})`,
          tools: [],
        };
      }
      // HTML (or an unlabelled body) is not a machine contract, but it does prove
      // the host answers: unverified rather than failed, so the entry is not
      // reported as an outage on a documentation or landing response.
      return {
        probeable: true,
        ok: null,
        detail: `Answered HTTP ${response.status} with ${contentType.split(";")[0] || "no content type"} — human-readable response, contract not machine-verified`,
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
  if (hasPlaceholder(endpoint)) {
    return notProbeable("Templated endpoint (placeholders) — resolved per call, not probeable");
  }
  if (!isHttp(endpoint)) {
    return notProbeable("Locally launched interface (stdio) — not remotely probeable");
  }
  // Never let a listed endpoint aim our own server at loopback, private or
  // cloud-metadata addresses.
  if (!isPublicHttpTarget(endpoint)) {
    return notProbeable("Non-public address (loopback/private/link-local) — not probed");
  }
  return entry.category === "mcp" ? probeMcp(endpoint) : probeHttpApi(endpoint);
}
