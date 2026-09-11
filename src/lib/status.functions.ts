import { createServerFn } from "@tanstack/react-start";
import {
  utcDayKeys,
  uptimeRatio,
  type Incident,
  type StatusEntry,
  type StatusPayload,
  type UptimeDay,
} from "@/lib/uptime-core";

const WINDOW_DAYS = 30;

type DailyRow = {
  slug: string;
  day: string;
  checks: number;
  ok: number;
  avg_latency: number | null;
};

type EntryRow = {
  slug: string;
  name: string;
  category: "api" | "mcp" | "cli";
  health_ok: boolean | null;
  health_checked_at: string | null;
  checks_total: number;
  checks_ok: number;
  avg_latency_ms: number | null;
};

/**
 * Public, unauthenticated reliability history: no account, no key.
 * RLS runs as `anon`, which only ever sees approved entries.
 */
export async function buildStatusPayload(): Promise<StatusPayload> {
  const { supabaseAnon } = await import("@/lib/mcp/supabase");
  const client = supabaseAnon();

  const [entriesRes, dailyRes, incidentsRes] = await Promise.all([
    client
      .from("entries")
      .select(
        "slug, name, category, health_ok, health_checked_at, checks_total, checks_ok, avg_latency_ms",
      )
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(500),
    client.rpc("public_uptime_daily", { _days: WINDOW_DAYS }),
    client.rpc("public_recent_incidents", { _limit: 20 }),
  ]);

  const entryRows = (entriesRes.error ? [] : ((entriesRes.data ?? []) as unknown as EntryRow[]));
  const dailyRows = (dailyRes.error ? [] : ((dailyRes.data ?? []) as unknown as DailyRow[]));
  const incidents = (incidentsRes.error
    ? []
    : ((incidentsRes.data ?? []) as unknown as Incident[])) as Incident[];

  const bySlug = new Map<string, Map<string, DailyRow>>();
  for (const row of dailyRows) {
    const day = String(row.day).slice(0, 10);
    const bucket = bySlug.get(row.slug) ?? new Map<string, DailyRow>();
    bucket.set(day, { ...row, day });
    bySlug.set(row.slug, bucket);
  }

  const keys = utcDayKeys(WINDOW_DAYS);
  const entries: StatusEntry[] = entryRows.map((entry) => {
    const bucket = bySlug.get(entry.slug);
    const days: UptimeDay[] = keys.map((day) => {
      const hit = bucket?.get(day);
      return {
        day,
        checks: hit?.checks ?? 0,
        ok: hit?.ok ?? 0,
        avg_latency: hit?.avg_latency ?? null,
      };
    });
    const checks = days.reduce((sum, d) => sum + d.checks, 0);
    const ok = days.reduce((sum, d) => sum + d.ok, 0);
    return { ...entry, days, window_uptime: uptimeRatio(ok, checks) };
  });

  const monitored = entries.filter((e) => e.days.some((d) => d.checks > 0));
  const checks = monitored.reduce((s, e) => s + e.days.reduce((a, d) => a + d.checks, 0), 0);
  const checksOk = monitored.reduce((s, e) => s + e.days.reduce((a, d) => a + d.ok, 0), 0);
  const latencies = entries
    .map((e) => e.avg_latency_ms)
    .filter((v): v is number => typeof v === "number" && v > 0);

  return {
    generated_at: new Date().toISOString(),
    window_days: WINDOW_DAYS,
    totals: {
      entries: entries.length,
      monitored: monitored.length,
      up: entries.filter((e) => e.health_ok === true).length,
      down: entries.filter((e) => e.health_ok === false).length,
      unknown: entries.filter((e) => e.health_ok === null).length,
      checks,
      checks_ok: checksOk,
      uptime: uptimeRatio(checksOk, checks),
      avg_latency_ms: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null,
    },
    entries,
    incidents,
  };
}

export const getStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<StatusPayload> => buildStatusPayload(),
);
