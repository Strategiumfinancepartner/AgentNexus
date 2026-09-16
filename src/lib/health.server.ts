/** Server-only health + capability probing for registry entries. */

import { hasPlaceholder, probeCapabilities } from "@/lib/capability-probe.server";


export type ProbeResult = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

const TIMEOUT_MS = 8000;

/**
 * Only concrete http(s) endpoints are probeable. CLI entries are not network
 * endpoints, and templated URLs (`{baseId}`, `<project-ref>`) are not callable
 * as-is — probing them would report a fake outage.
 */
export function isProbeable(endpoint: string): boolean {
  const url = endpoint.trim();
  return /^https?:\/\//i.test(url) && !hasPlaceholder(url);
}

export async function probeEndpoint(endpoint: string): Promise<ProbeResult> {
  const url = endpoint.trim();
  if (!isProbeable(url)) {
    return { ok: false, status_code: null, latency_ms: null, error: "Not an HTTP endpoint" };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const attempt = async (method: "HEAD" | "GET") =>
    fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "AgentNexus-HealthCheck/1.0" },
    });

  try {
    let response: Response;
    try {
      response = await attempt("HEAD");
      if (response.status === 405 || response.status === 501) response = await attempt("GET");
    } catch {
      response = await attempt("GET");
    }
    const latency = Date.now() - started;
    // Any answer below 500 proves the host is alive: 401/403 are correct gating,
    // and 404/405 on a REST base path simply means no handler at the root.
    const ok = response.status < 500;
    return {
      ok,
      status_code: response.status,
      latency_ms: latency,
      error: ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status_code: null,
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message.slice(0, 200) : "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

type EntryRow = {
  id: string;
  slug: string;
  endpoint: string;
  category: string;
  probe_url: string | null;
};

/**
 * The URL we can actually ping for an entry: its endpoint when that is a
 * concrete http(s) URL, otherwise the curated fallback reference (package
 * registry, docs page) stored in `probe_url`.
 */
export function probeTarget(row: { endpoint: string; probe_url?: string | null }) {
  if (isProbeable(row.endpoint)) return { url: row.endpoint.trim(), fallback: false };
  const fallback = row.probe_url?.trim();
  if (fallback && isProbeable(fallback)) return { url: fallback, fallback: true };
  return null;
}

/**
 * Probes approved entries and persists results. Requires a service-role client.
 * Two layers per entry: liveness (is the host answering?) and capability
 * (does the interface expose the contract it claims?).
 */
export async function runHealthChecks(
  supabaseAdmin: {
    from: (table: string) => any;
  },
  limit = 50,
): Promise<{
  checked: number;
  ok: number;
  failed: number;
  skipped: number;
  capability_probed: number;
  capability_ok: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("entries")
    .select("id, slug, endpoint, category, probe_url")
    .eq("status", "approved")
    .order("health_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EntryRow[];
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let capabilityProbed = 0;
  let capabilityOk = 0;

  for (const row of rows) {
    const target = probeTarget(row);
    if (!target) {
      // Nothing pingable. Still stamp the row so the rotation moves on instead
      // of picking the same unprobeable entries on every run.
      skipped++;
      await supabaseAdmin
        .from("entries")
        .update({ health_checked_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }
    const result = await probeEndpoint(target.url);
    result.ok ? ok++ : failed++;

    const capability = await probeCapabilities(row);
    if (capability.probeable) {
      capabilityProbed++;
      if (capability.ok) capabilityOk++;
    }

    const checkedAt = new Date().toISOString();
    await supabaseAdmin.from("health_checks").insert({
      entry_id: row.id,
      ok: result.ok,
      status_code: result.status_code,
      latency_ms: result.latency_ms,
      error: result.error,
      checked_at: checkedAt,
      probe_kind: target.fallback ? "reference" : row.category === "mcp" ? "mcp" : "http",
    });

    const update: Record<string, unknown> = {
      health_ok: result.ok,
      health_status_code: result.status_code,
      health_latency_ms: result.latency_ms,
      health_checked_at: checkedAt,
    };
    if (capability.probeable) {
      update['capability_ok'] = capability.ok;
      update['capability_detail'] = capability.detail;
      update['capability_checked_at'] = checkedAt;
      if (capability.tools.length > 0) update['discovered_tools'] = capability.tools;
    }
    await supabaseAdmin.from("entries").update(update).eq("id", row.id);
  }

  return {
    checked: ok + failed,
    ok,
    failed,
    skipped,
    capability_probed: capabilityProbed,
    capability_ok: capabilityOk,
  };

}
