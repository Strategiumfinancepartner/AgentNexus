import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertReviewer } from "@/lib/registry-core";

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

    const [signals, reports, capability] = await Promise.all([
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
    ]);

    const rows = (signals.data ?? []) as NeedRow[];
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

    const unmet = [...unmetMap.values()].sort(
      (a, b) => b.occurrences - a.occurrences || b.last_seen.localeCompare(a.last_seen),
    );

    const failures = ((reports.data ?? []) as ReportRow[]).filter((r) => r.outcome === "failure");

    return {
      totals: {
        queries: rows.length,
        unmet: rows.filter((r) => r.matched_count === 0).length,
        reports: (reports.data ?? []).length,
        failures: failures.length,
      },
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
