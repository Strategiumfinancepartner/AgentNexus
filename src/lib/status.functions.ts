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
// PostgREST caps every response at 1000 rows. Both queries page through that
// cap so the full catalogue and its full history are never silently truncated.
const PAGE = 1000;

type DailyRow = {
  slug: string;
  day: string;
  checks: number;
  ok: number;
  avg_latency: number | null;
};

type EntryRow = {
  id: string;
  slug: string;
  name: string;
  category: "api" | "mcp" | "cli";
  health_ok: boolean | null;
  health_checked_at: string | null;
  checks_total: number;
  checks_ok: number;
  avg_latency_ms: number | null;
  schema_ok: boolean | null;
  schema_detail: string | null;
  schema_checked_at: string | null;
};

type CheckRow = {
  entry_id: string;
  ok: boolean;
  latency_ms: number | null;
  checked_at: string;
  probe_kind: string;
};

/**
 * Public, unauthenticated reliability history: no account, no key.
 * RLS runs as `anon`, which only ever sees approved entries.
 */
export async function buildStatusPayload(): Promise<StatusPayload> {
  const { supabaseAnon } = await import("@/lib/mcp/supabase");
  const client = supabaseAnon();

  const [entryRows, checkRows, incidents] = await Promise.all([
    fetchAllApproved(client),
    fetchAllChecks(client),
    fetchIncidents(client),
  ]);
  // Documentation probes ("publisher reachable") are a weaker signal than a
  // service probe: kept separate, never mixed into uptime or "monitored".
  const serviceChecks = checkRows.filter((c) => c.probe_kind !== "docs");
  const docsChecks = checkRows.filter((c) => c.probe_kind === "docs");
  const serviceIds = new Set(serviceChecks.map((c) => c.entry_id));
  const lastDocs = new Map<string, boolean>();
  for (const c of docsChecks) if (!serviceIds.has(c.entry_id)) lastDocs.set(c.entry_id, c.ok);
  const dailyRows = aggregateDaily(entryRows, serviceChecks);

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

  const schemaEntries = entries
    .filter((e) => Boolean(e.schema_checked_at))
    .map((e) => ({
      slug: e.slug,
      name: e.name,
      ok: e.schema_ok ?? null,
      detail: e.schema_detail ?? null,
      checked_at: e.schema_checked_at as string,
    }));

  return {
    generated_at: new Date().toISOString(),
    window_days: WINDOW_DAYS,
    schema_validation: {
      probed: schemaEntries.length,
      ok: schemaEntries.filter((e) => e.ok === true).length,
      failed: schemaEntries.filter((e) => e.ok === false).length,
      entries: schemaEntries,
    },
    totals: {
      entries: entries.length,
      monitored: monitored.length,
      up: entries.filter((e) => e.health_ok === true).length,
      down: entries.filter((e) => e.health_ok === false).length,
      unknown: entries.filter((e) => e.health_ok === null).length,
      checks,
      checks_ok: checksOk,
      uptime: uptimeRatio(checksOk, checks),
      docs_tracked: lastDocs.size,
      docs_reachable: [...lastDocs.values()].filter(Boolean).length,
      avg_latency_ms: latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null,
    },
    entries,
    incidents,
  };
}

async function fetchAllApproved(client: {
  from: (table: string) => any;
}): Promise<EntryRow[]> {
  const rows: EntryRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("entries")
      .select(
        "id, slug, name, category, health_ok, health_checked_at, checks_total, checks_ok, avg_latency_ms, schema_ok, schema_detail, schema_checked_at",
      )
      .eq("status", "approved")
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) break;
    const page = (data ?? []) as unknown as EntryRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function fetchAllChecks(client: {
  from: (table: string) => any;
}): Promise<CheckRow[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const rows: CheckRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("health_checks")
      .select("entry_id, ok, latency_ms, checked_at, probe_kind")
      .gte("checked_at", since)
      .order("checked_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) break;
    const page = (data ?? []) as unknown as CheckRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

async function fetchIncidents(client: { rpc: (fn: string, args: unknown) => any }): Promise<
  Incident[]
> {
  const { data, error } = await client.rpc("public_recent_incidents", { _limit: 20 });
  return error ? [] : ((data ?? []) as unknown as Incident[]);
}

/** Mirrors the public_uptime_daily aggregation, but over the full check history. */
function aggregateDaily(entryRows: EntryRow[], checkRows: CheckRow[]): DailyRow[] {
  const slugById = new Map<string, string>();
  for (const row of entryRows) slugById.set(row.id, row.slug);

  const acc = new Map<
    string,
    { slug: string; day: string; checks: number; ok: number; latencySum: number; latencyCount: number }
  >();
  for (const c of checkRows) {
    const slug = slugById.get(c.entry_id);
    if (!slug) continue;
    // checked_at is an ISO timestamp; the UTC date is the leading YYYY-MM-DD.
    const day = String(c.checked_at).slice(0, 10);
    const key = `${slug}|${day}`;
    const a = acc.get(key) ?? { slug, day, checks: 0, ok: 0, latencySum: 0, latencyCount: 0 };
    a.checks++;
    if (c.ok) a.ok++;
    if (typeof c.latency_ms === "number" && c.latency_ms > 0) {
      a.latencySum += c.latency_ms;
      a.latencyCount++;
    }
    acc.set(key, a);
  }
  return [...acc.values()].map((a) => ({
    slug: a.slug,
    day: a.day,
    checks: a.checks,
    ok: a.ok,
    avg_latency: a.latencyCount ? Math.round(a.latencySum / a.latencyCount) : null,
  }));
}

export const getStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<StatusPayload> => buildStatusPayload(),
);
