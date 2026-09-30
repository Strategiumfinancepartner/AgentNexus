import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertReviewer, matchScore, needTokens, ENTRY_COLUMNS, type MatchSource } from "@/lib/registry-core";

/** Monitor noise and command probes are not real requests for a capability. */
const NOISE_NEEDS = new Set(["test", "ping", "healthcheck", "health check"]);

function isRealNeed(need: string): boolean {
  const normalized = need.trim().toLowerCase();
  if (NOISE_NEEDS.has(normalized) || needTokens(need).length === 0) return false;
  // Historical scanner traffic (including 28 September) must not create
  // artificial catalogue gaps. Restrict this to command syntax, not words
  // like "shell" or "terminal" that can be genuine capability requests.
  if (/(?:;\s*(?:ls|id|cat|echo|whoami)\b|\$\s*\(|`[^`]+`|&&\s*(?:ls|id|cat|echo|whoami)\b)/i.test(need)) return false;
  return true;
}

export type NeedRow = {
  need: string;
  tokens: string[];
  matched_count: number;
  top_slug: string | null;
  category: string | null;
  source: string;
  created_at: string;
};

export type UnmetNeed = { need: string; occurrences: number; last_seen: string; sources: string[] };

export type ThinNeed = {
  need: string;
  occurrences: number;
  matched: number;
  slugs: string[];
  last_seen: string;
};

/** One failed response we handed back on a machine-facing surface. */
export type ErrorRow = {
  surface: string;
  path: string;
  method: string;
  status_code: number;
  tier: string;
  actor: string;
  user_agent: string;
  detail: string;
  created_at: string;
};

export type ReportRow = {
  slug: string;
  outcome: string;
  status_code: number | null;
  error: string | null;
  latency_ms: number | null;
  source: string;
  created_at: string;
};

/** Reviewer-only view of what agents asked for and what broke when they called. */
export const getOpsInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);

    const [signals, reports, capability, catalog, errors] = await Promise.all([
      context.supabase
        .from("need_signals")
        .select("need, tokens, matched_count, top_slug, category, source, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      context.supabase
        .from("invocation_reports")
        .select("slug, outcome, status_code, error, latency_ms, source, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("entries")
        .select("slug, name, category, capability_ok, capability_detail, capability_checked_at, discovered_tools")
        .eq("status", "approved")
        .not("capability_checked_at", "is", null)
        .order("capability_ok", { ascending: true })
        .limit(60),
      context.supabase
        .from("entries")
        .select(ENTRY_COLUMNS)
        .eq("status", "approved")
        .limit(2000),
      // Kept in its own counter: broken responses are not traffic.
      (context.supabase as any)
        .from("error_events")
        .select("surface, path, method, status_code, tier, actor, user_agent, detail, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    // Live coverage: how many interfaces answer this need against today's
    // catalogue. A query that was thin (or unmet) before we filled the gap must
    // not keep haunting the dashboard.
    const entries = (catalog.data ?? []) as MatchSource[];
    const coverageCache = new Map<string, number>();
    const coverageNow = (need: string) => {
      const key = need.trim().toLowerCase();
      const cached = coverageCache.get(key);
      if (cached != null) return cached;
      const tokens = needTokens(need);
      const count = tokens.length
        ? entries.filter((e) => matchScore(e, tokens) > 0).length
        : 0;
      coverageCache.set(key, count);
      return count;
    };

    const rows = ((signals.data ?? []) as NeedRow[]).filter((r) => isRealNeed(r.need));
    const unmetMap = new Map<string, UnmetNeed>();
    for (const row of rows) {
      if (row.matched_count > 0) continue;
      const key = row.need.trim().toLowerCase();
      const existing = unmetMap.get(key);
      if (existing) {
        existing.occurrences += 1;
        if (!existing.sources.includes(row.source)) existing.sources.push(row.source);
      } else {
        unmetMap.set(key, {
          need: row.need,
          occurrences: 1,
          last_seen: row.created_at,
          sources: [row.source],
        });
      }
    }

    const unmet = [...unmetMap.values()]
      .filter((n) => coverageNow(n.need) === 0)
      .sort((a, b) => b.occurrences - a.occurrences || b.last_seen.localeCompare(a.last_seen));

    const failures = ((reports.data ?? []) as ReportRow[]).filter((r) => r.outcome === "failure");

    // Thin coverage: queries that matched, but barely. These are the gaps of
    // tomorrow — one entry going stale turns them into an unanswered query.
    const thinMap = new Map<string, ThinNeed>();
    for (const row of rows) {
      if (row.matched_count < 1 || row.matched_count > 2) continue;
      const key = row.need.trim().toLowerCase();
      const existing = thinMap.get(key);
      if (existing) {
        existing.occurrences += 1;
        existing.matched = Math.min(existing.matched, row.matched_count);
        if (row.top_slug && !existing.slugs.includes(row.top_slug)) existing.slugs.push(row.top_slug);
      } else {
        thinMap.set(key, {
          need: row.need,
          occurrences: 1,
          matched: row.matched_count,
          slugs: row.top_slug ? [row.top_slug] : [],
          last_seen: row.created_at,
        });
      }
    }
    const thin = [...thinMap.values()]
      .filter((n) => coverageNow(n.need) <= 2)
      .sort((a, b) => a.matched - b.matched || b.occurrences - a.occurrences);

    const errorRows = ((errors as { data?: unknown }).data ?? []) as ErrorRow[];
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const last24h = rows.filter((r) => new Date(r.created_at).getTime() >= dayAgo);

    return {
      totals: {
        queries: rows.length,
        unmet: rows.filter((r) => r.matched_count === 0 && coverageNow(r.need) === 0).length,
        reports: (reports.data ?? []).length,
        failures: failures.length,
        queries24h: last24h.length,
        unmet24h: last24h.filter((r) => r.matched_count === 0 && coverageNow(r.need) === 0).length,
        thin: thin.length,
        errors: errorRows.length,
        errors24h: errorRows.filter((e) => new Date(e.created_at).getTime() >= dayAgo).length,
      },
      errors: errorRows.slice(0, 40),
      thin: thin.slice(0, 25),
      unmet: unmet.slice(0, 25),
      recentQueries: rows.slice(0, 25),
      reports: ((reports.data ?? []) as ReportRow[]).slice(0, 25),
      capability: (capability.data ?? []) as {
        slug: string;
        name: string;
        category: string;
        capability_ok: boolean | null;
        capability_detail: string;
        capability_checked_at: string | null;
        discovered_tools: string[];
      }[],
    };
  });
