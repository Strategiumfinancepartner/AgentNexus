/**
 * Feedback loop — the registry learns from the agents that call it.
 *
 * Two signals, both written through the service role so no client can forge or
 * read them: what agents were looking for (especially when nothing matched),
 * and what actually happened when they invoked an indexed interface.
 */

type AdminClient = { from: (table: string) => any; rpc: (fn: string, args: unknown) => any };

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AdminClient;
}

export type NeedSignal = {
  need: string;
  tokens: string[];
  category?: string | null;
  matchedCount: number;
  topSlug?: string | null;
  source: "api" | "mcp" | "web";
};

/** Records a discovery query. Never throws: telemetry must not break discovery. */
export async function recordNeedSignal(signal: NeedSignal): Promise<void> {
  try {
    const client = await admin();
    await client.from("need_signals").insert({
      need: signal.need.slice(0, 300),
      tokens: signal.tokens.slice(0, 20),
      category: signal.category ?? null,
      matched_count: signal.matchedCount,
      top_slug: signal.topSlug ?? null,
      source: signal.source,
    });
  } catch {
    // swallow — telemetry is best-effort
  }
}

export type InvocationReport = {
  slug: string;
  outcome: "success" | "failure";
  statusCode?: number | null;
  error?: string | null;
  latencyMs?: number | null;
  source: "api" | "mcp";
  reportedBy?: string | null;
  /** Quota identity to credit for closing the loop (see quota.server). */
  creditActor?: string | null;
};

export async function recordInvocationReport(
  report: InvocationReport,
): Promise<{ ok: boolean; error?: string; bonusCalls?: number }> {
  const client = await admin();
  const slug = report.slug.trim().toLowerCase();

  const { data: entry } = await client
    .from("entries")
    .select("id")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!entry) return { ok: false, error: `No approved entry with slug "${slug}".` };

  const { error } = await client.from("invocation_reports").insert({
    entry_id: (entry as { id: string }).id,
    slug,
    outcome: report.outcome,
    status_code: report.statusCode ?? null,
    error: report.error ? report.error.slice(0, 500) : null,
    latency_ms: report.latencyMs ?? null,
    source: report.source,
    reported_by: report.reportedBy ?? null,
  });
  if (error) return { ok: false, error: error.message };

  // Reciprocity: a real report buys a few extra calls today. Small on purpose —
  // sustained volume is what Agent Pro is for.
  let bonusCalls = 0;
  if (report.creditActor) {
    try {
      const { REPORT_BONUS_CALLS, REPORT_BONUS_MAX } = await import("@/lib/quota.server");
      const { data } = await client.rpc("grant_report_credit", { _actor: report.creditActor });
      const reports = Number(data ?? 0);
      bonusCalls = Math.min(reports * REPORT_BONUS_CALLS, REPORT_BONUS_MAX);
    } catch {
      bonusCalls = 0;
    }
  }
  return { ok: true, bonusCalls };
}

/**
 * Sliding-window rate limit enforced in Postgres so it holds across the
 * stateless workers that serve the app.
 */
export async function consumeRateLimit(
  bucket: string,
  actor: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const client = await admin();
    const { data, error } = await client.rpc("consume_rate_limit", {
      _bucket: bucket,
      _actor: actor.slice(0, 200),
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) return true; // fail open rather than block legitimate traffic
    return data !== false;
  } catch {
    return true;
  }
}

/** Best-effort caller identity for anonymous public endpoints. */
export function requestActor(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  return `ip:${ip}`;
}
