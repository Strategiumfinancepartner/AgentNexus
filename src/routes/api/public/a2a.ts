import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { buildDiscovery, needTokens } from "@/lib/registry-core";
import { recordNeedSignal } from "@/lib/telemetry.server";
import { enforceQuota } from "@/lib/quota.server";
import { isAbuseBlocked, looksLikeInjection, recordAbuseStrike } from "@/lib/abuse-guard.server";
import { agentCard } from "@/lib/agent-card";

/**
 * /api/public/a2a — A2A (Agent2Agent, Linux Foundation) JSON-RPC 2.0 surface.
 *
 * This is the endpoint advertised as `url` on our agent card, so every A2A
 * directory probe lands here. Directories heartbeat it with a no-op message and
 * score us on: valid JSON-RPC 2.0 envelope, version negotiation via the
 * `A2A-Version` header, and answer latency. So:
 *   - an empty / no-op message is answered with a usage Message, never an error;
 *   - unknown-but-plausible method spellings are routed to message/send;
 *   - the negotiated protocol version is echoed back in the response header.
 *
 * Real work: the text part of the incoming message is treated as a capability
 * need and answered with ranked registry matches, both as text (for a model)
 * and as a DataPart (for a program).
 */

const A2A_VERSIONS = ["1.0", "0.3", "0.2.5"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, a2a-version, x-api-key, authorization",
  "Access-Control-Expose-Headers": "A2A-Version",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function negotiateVersion(requested: string | null) {
  if (!requested) return "1.0";
  const wanted = requested.trim();
  // Major.Minor only: a patch-form header is refused by strict A2A servers.
  const normalized = wanted.split(".").slice(0, 2).join(".");
  return A2A_VERSIONS.includes(wanted) ? wanted : A2A_VERSIONS.includes(normalized) ? normalized : "1.0";
}

function rpc(id: unknown, result: unknown, version: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }, null, 2), {
    status,
    headers: { ...cors, "A2A-Version": version },
  });
}

function rpcError(id: unknown, code: number, message: string, version: string, data?: unknown) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data ? { data } : {}) } }),
    { status: 200, headers: { ...cors, "A2A-Version": version } },
  );
}

function messageId() {
  return `msg-${crypto.randomUUID()}`;
}

function agentMessage(parts: unknown[], contextId?: string) {
  return {
    kind: "message",
    role: "agent",
    messageId: messageId(),
    ...(contextId ? { contextId } : {}),
    parts,
  };
}

/**
 * A2A v1.0 SendMessage returns SendMessageResponse = { message } with
 * ROLE_AGENT and kind-less parts; v0.x message/send returns the Message itself.
 */
function messageResult(parts: any[], contextId: string | undefined, v1: boolean) {
  if (!v1) return agentMessage(parts, contextId);
  return {
    message: {
      messageId: messageId(),
      ...(contextId ? { contextId } : {}),
      role: "ROLE_AGENT",
      parts: parts.map((p) =>
        p?.kind === "data" ? { data: p.data, mediaType: "application/json" } : { text: p?.text ?? "" },
      ),
    },
  };
}

/** Pull the user's text out of whatever shape the caller used. */
function extractText(params: any): string {
  const out: string[] = [];
  const message = params?.message ?? params?.request?.message ?? params;
  const parts = message?.parts ?? message?.content ?? [];
  if (Array.isArray(parts)) {
    for (const part of parts) {
      if (typeof part === "string") out.push(part);
      else if (part && typeof part === "object") {
        const p = part as Record<string, unknown>;
        const textValue = p["text"];
        const dataValue = p["data"];
        if (typeof textValue === "string") out.push(textValue);
        else if (p["kind"] === "data" && dataValue && typeof dataValue === "object") {
          const d = dataValue as Record<string, unknown>;
          for (const key of ["need", "query", "task", "prompt", "text"]) {
            if (typeof d[key] === "string") out.push(d[key] as string);
          }
        }
      }
    }
  } else if (typeof parts === "string") out.push(parts);
  for (const key of ["text", "need", "query", "prompt", "task"]) {
    if (typeof message?.[key] === "string") out.push(message[key]);
  }
  return out.join(" ").trim().slice(0, 300);
}

const USAGE = {
  hint: "Send a plain-language capability need as a TextPart, e.g. 'send a transactional email'. The reply carries ranked APIs, MCP servers and CLIs with endpoint, auth mode, formats, limits, pricing and a 0-100 reliability score.",
  methods: ["message/send (A2A v0.x)", "SendMessage (A2A v1.0)", "GetAgentCard", "tasks/get"],
  example: {
    jsonrpc: "2.0",
    id: 1,
    method: "message/send",
    params: {
      message: {
        role: "user",
        kind: "message",
        messageId: "msg-1",
        parts: [{ kind: "text", text: "send a transactional email" }],
      },
    },
  },
  also: {
    http_json: "/api/public/discover",
    mcp: "/api/public/mcp",
    bulk: "/api/public/entries.ndjson",
  },
};

async function handleSend(id: unknown, params: any, version: string, contextId: string | undefined, v1: boolean) {
  const need = extractText(params);
  // A heartbeat / no-op probe: answer with usage, never an error.
  if (need.length < 2) {
    return rpc(
      id,
      messageResult(
        [
          { kind: "text", text: USAGE.hint },
          { kind: "data", data: USAGE },
        ],
        contextId,
        v1,
      ),
      version,
    );
  }

  const { data, error } = await supabaseAnon()
    .from("entries")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .limit(500);

  if (error) {
    return rpcError(id, -32003, "Registry temporarily unavailable", version);
  }

  const tokens = needTokens(need);
  const result = buildDiscovery((data ?? []) as any[], {
    need,
    tokens,
    category: null,
    minReliability: 0,
    limit: 5,
  });

  await recordNeedSignal({
    need,
    tokens,
    category: null,
    matchedCount: result.count,
    topSlug: result.count > 0 ? (result.matches[0]?.slug ?? null) : null,
    source: "api",
  });

  const lines = (result.matches ?? []).map(
    (m: any, i: number) =>
      `${i + 1}. ${m.name} (${m.category}) — ${m.call?.endpoint ?? m.endpoint ?? "n/a"} · auth: ${
        m.call?.auth_mode ?? m.auth_mode ?? "unknown"
      } · reliability ${m.trust?.reliability_score ?? "n/a"}/100 · ${m.summary ?? ""}`,
  );
  const text =
    lines.length > 0
      ? `${result.count} interface(s) for "${need}" (coverage: ${result.coverage}):\n${lines.join("\n")}`
      : `No exact match for "${need}". ${result.note ?? ""}`;

  return rpc(
    id,
    messageResult(
      [
        { kind: "text", text },
        { kind: "data", data: result },
      ],
      contextId,
      v1,
    ),
    version,
  );
}

export const Route = createFileRoute("/api/public/a2a")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      // A GET is not part of A2A, but probes try it: describe the surface.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const version = negotiateVersion(request.headers.get("a2a-version"));
        return new Response(
          JSON.stringify(
            {
              transport: "JSONRPC",
              protocol: "A2A",
              protocolVersions: A2A_VERSIONS,
              agentCard: `${url.origin}/.well-known/agent-card.json`,
              usage: USAGE,
            },
            null,
            2,
          ),
          { headers: { ...cors, "A2A-Version": version } },
        );
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const version = negotiateVersion(request.headers.get("a2a-version"));
        const raw = await request.text().catch(() => "");
        let body: any = null;
        try {
          body = raw.trim() ? JSON.parse(raw) : null;
        } catch {
          return rpcError(null, -32700, "Parse error: body is not valid JSON", version);
        }
        if (Array.isArray(body)) {
          return rpcError(null, -32600, "Batch requests are not supported on this surface", version);
        }
        if (!body || typeof body !== "object") {
          // Empty POST from a liveness probe: answer, don't fail.
          return rpc(null, agentMessage([{ kind: "text", text: USAGE.hint }, { kind: "data", data: USAGE }]), version);
        }

        const id = body.id ?? null;
        const method = String(body.method ?? "").trim();
        const params = body.params ?? {};
        const contextId =
          typeof params?.message?.contextId === "string" ? params.message.contextId : undefined;

        const normalized = method.toLowerCase().replace(/[^a-z]/g, "");

        if (normalized === "ping" || normalized === "health") {
          return rpc(id, { status: "ok", protocolVersion: version }, version);
        }
        if (normalized === "getagentcard" || normalized === "agentgetauthenticatedextendedcard") {
          return rpc(id, agentCard(url.origin), version);
        }
        if (normalized === "tasksget" || normalized === "gettask") {
          return rpcError(
            id,
            -32001,
            "Task not found: this agent answers synchronously and stores no tasks",
            version,
          );
        }
        if (normalized === "messagestream" || normalized === "sendstreamingmessage") {
          return rpcError(id, -32004, "Streaming is not supported; use message/send", version);
        }
        if (
          normalized === "messagesend" ||
          normalized === "sendmessage" ||
          normalized === "send" ||
          normalized === "discover" ||
          normalized === "discovercapabilities" ||
          normalized === ""
        ) {
          // v1.0 shape for SendMessage, or any non-v0 spelling on a 1.0 negotiation.
          const v1 = normalized === "sendmessage" || (version === "1.0" && normalized !== "messagesend");
          const quota = await enforceQuota(request);
          if (!quota.allowed) {
            return rpcError(
              id,
              -32000,
              `Daily quota exceeded (${quota.tier}, ${quota.limit}/day). Free key: POST ${url.origin}/api/public/keys`,
              version,
            );
          }
          if (await isAbuseBlocked(request)) {
            return rpcError(
              id,
              -32005,
              "Blocked: this address repeatedly sent injection-style payloads. Lifts 24h after the last attempt.",
              version,
            );
          }
          // Injection-style payload in the message text: benign empty answer,
          // strike recorded; 3 strikes in 24h and the address is refused above.
          const incomingText = extractText(params);
          if (looksLikeInjection(incomingText)) {
            void recordAbuseStrike(request);
            return rpc(
              id,
              messageResult(
                [
                  {
                    kind: "text",
                    text: `No exact match for "${incomingText}". Describe a task in plain language, e.g. 'send a transactional email'.`,
                  },
                  { kind: "data", data: { need: incomingText, coverage: "none", count: 0, matches: [] } },
                ],
                contextId,
                v1,
              ),
              version,
            );
          }
          return handleSend(id, params, version, contextId, v1);
        }
        return rpcError(id, -32601, `Method not found: "${method}"`, version, {
          supported: USAGE.methods,
        });
      },
    },
  },
});
