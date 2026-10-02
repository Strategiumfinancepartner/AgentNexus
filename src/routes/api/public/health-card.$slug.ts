import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

/**
 * Agent-facing health card: the live evidence an agent needs to rank an
 * interface without inferring trust from its README. Public, no key.
 */
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=120",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers });

function transportOf(category: string, endpoint: string | null): string {
  const url = (endpoint ?? "").toLowerCase();
  if (category === "cli") return "local-process";
  if (category === "mcp") {
    if (url.includes("/sse")) return "mcp-sse";
    if (url.startsWith("http")) return "mcp-streamable-http";
    return "mcp-stdio";
  }
  return url.startsWith("https") ? "https" : url.startsWith("http") ? "http" : "unknown";
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value ?? null));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function serve({ params, request }: { params: { slug: string }; request: Request }) {
  const origin = new URL(request.url).origin;
  const slug = decodeURIComponent(params.slug).trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return json({ error: "Invalid slug" }, 400);

  const client = supabaseAnon() as any;
  const { data: e } = await client
    .from("entries")
    .select(
      "id, slug, name, category, endpoint, auth_mode, auth_params, input_format, output_format, rate_limit, pricing, verified, verified_at, health_ok, health_status_code, health_latency_ms, health_checked_at, checks_total, checks_ok, avg_latency_ms, capability_ok, capability_checked_at, discovered_tools, schema_ok, schema_detail, schema_checked_at",
    )
    .eq("status", "approved")
    .eq("slug", slug)
    .maybeSingle();
  if (!e) {
    return json(
      { error: "Not found", slug, search: `${origin}/api/public/discover?need=${encodeURIComponent(slug.replace(/-/g, " "))}` },
      404,
    );
  }

  const { data: failures } = await client
    .from("health_checks")
    .select("checked_at, status_code, latency_ms, error, probe_kind")
    .eq("entry_id", e.id)
    .eq("ok", false)
    .order("checked_at", { ascending: false })
    .limit(1);
  const lastFail = failures?.[0] ?? null;

  const tools = Array.isArray(e.discovered_tools) ? e.discovered_tools : [];
  const schemaHash = await sha256({ input: e.input_format, output: e.output_format, tools });
  const reliability = e.checks_total > 0 ? Math.round((e.checks_ok / e.checks_total) * 1000) / 10 : null;

  const now = Date.now();
  const EVIDENCE_TTL_MS = 24 * 60 * 60 * 1000;
  const probedAt = e.health_checked_at ? Date.parse(e.health_checked_at) : null;
  const evidenceExpires = probedAt ? probedAt + EVIDENCE_TTL_MS : null;

  return json({
    slug: e.slug,
    name: e.name,
    generated_at: new Date(now).toISOString(),
    expiry: {
      card_expires_at: new Date(now + 120_000).toISOString(),
      evidence_expires_at: evidenceExpires ? new Date(evidenceExpires).toISOString() : null,
      evidence_age_s: probedAt ? Math.round((now - probedAt) / 1000) : null,
      stale: evidenceExpires ? now > evidenceExpires : true,
      rule: "Re-fetch this card after card_expires_at. Treat the evidence as untrusted after evidence_expires_at or when stale is true.",
      refresh: `${origin}/api/public/health-card/${e.slug}`,
    },
    last_probe: {
      at: e.health_checked_at,
      ok: e.health_ok,
      status_code: e.health_status_code,
      latency_ms: e.health_latency_ms,
      capability_ok: e.capability_ok,
      capability_checked_at: e.capability_checked_at,
    },
    transport: { kind: transportOf(e.category, e.endpoint), endpoint: e.endpoint },
    auth_shape: { mode: e.auth_mode, params: e.auth_params ?? null },
    schema: {
      hash: `sha256:${schemaHash}`,
      hash_covers: "input_format + output_format + discovered tool names/schemas",
      tool_count: tools.length,
      validated: e.schema_ok,
      detail: e.schema_detail,
      checked_at: e.schema_checked_at,
    },
    publisher_proof: {
      verified: Boolean(e.verified),
      verified_at: e.verified_at,
      method: e.verified ? "registry review + live probe" : null,
    },
    failing_example: lastFail
      ? {
          at: lastFail.checked_at,
          status_code: lastFail.status_code,
          latency_ms: lastFail.latency_ms,
          error: lastFail.error,
          probe: lastFail.probe_kind,
        }
      : null,
    retry_cost: {
      rate_limit: e.rate_limit,
      pricing: e.pricing,
      avg_latency_ms: e.avg_latency_ms,
      reliability_pct: reliability,
      samples: e.checks_total,
      suggested_backoff_ms: Math.max(1000, (e.avg_latency_ms ?? 500) * 2),
    },
    links: {
      entry: `${origin}/api/public/registry/${e.slug}`,
      history: `${origin}/api/public/status?slug=${e.slug}`,
      report: `${origin}/api/public/report`,
    },
  });
}

export const Route = createFileRoute("/api/public/health-card/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async (ctx: any) => serve(ctx),
      HEAD: async (ctx: any) => serve(ctx),
    },
  },
});
