/** Server-only health + capability probing for registry entries. */

import { probeCapabilities } from "@/lib/capability-probe.server";


export type ProbeResult = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

const TIMEOUT_MS = 8000;

/** Only http(s) endpoints are probeable; CLI entries are not network endpoints. */
export function isProbeable(endpoint: string): boolean {
  return /^https?:\/\//i.test(endpoint.trim());
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
    // Auth-protected endpoints answering 401/403 are alive and correctly gated.
    const ok = response.status < 500 && response.status !== 404;
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

type EntryRow = { id: string; slug: string; endpoint: string };

/** Probes approved entries and persists results. Requires a service-role client. */
export async function runHealthChecks(
  supabaseAdmin: {
    from: (table: string) => any;
  },
  limit = 50,
): Promise<{ checked: number; ok: number; failed: number; skipped: number }> {
  const { data, error } = await supabaseAdmin
    .from("entries")
    .select("id, slug, endpoint")
    .eq("status", "approved")
    .order("health_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EntryRow[];
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!isProbeable(row.endpoint)) {
      skipped++;
      continue;
    }
    const result = await probeEndpoint(row.endpoint);
    result.ok ? ok++ : failed++;

    const checkedAt = new Date().toISOString();
    await supabaseAdmin.from("health_checks").insert({
      entry_id: row.id,
      ok: result.ok,
      status_code: result.status_code,
      latency_ms: result.latency_ms,
      error: result.error,
      checked_at: checkedAt,
    });
    await supabaseAdmin
      .from("entries")
      .update({
        health_ok: result.ok,
        health_status_code: result.status_code,
        health_latency_ms: result.latency_ms,
        health_checked_at: checkedAt,
      })
      .eq("id", row.id);
  }

  return { checked: ok + failed, ok, failed, skipped };
}
