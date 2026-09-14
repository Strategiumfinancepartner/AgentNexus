import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";
import { enforceQuota, quotaExceeded } from "@/lib/quota.server";

const baseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier",
  "Cache-Control": "no-store",
};

type Row = { category: string; capabilities: string[] | null; tags: string[] | null };

/**
 * Vocabulary index: what the registry can actually do, aggregated.
 * Lets an agent decide whether Nexus is worth calling before it calls it.
 */
export const Route = createFileRoute("/api/public/capabilities")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: baseHeaders }),
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const quota = await enforceQuota(request);
        if (!quota.allowed) return quotaExceeded(quota, origin, baseHeaders);
        const headers = { ...baseHeaders, ...quota.headers };
        const { data, error } = await supabaseAnon()
          .from("entries")
          .select("category, capabilities, tags")
          .eq("status", "approved")
          .limit(1000);

        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers,
          });
        }

        const rows = (data ?? []) as Row[];
        const count = (pick: (r: Row) => string[]) => {
          const map = new Map<string, number>();
          for (const row of rows) {
            for (const raw of pick(row) ?? []) {
              const key = String(raw).trim().toLowerCase();
              if (key) map.set(key, (map.get(key) ?? 0) + 1);
            }
          }
          return [...map.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([name, entries]) => ({ name, entries }));
        };

        const categories: Record<string, number> = {};
        for (const row of rows) categories[row.category] = (categories[row.category] ?? 0) + 1;

        return new Response(
          JSON.stringify(
            {
              total_entries: rows.length,
              categories,
              capabilities: count((r) => r.capabilities ?? []),
              tags: count((r) => r.tags ?? []),
              next: {
                discover: `${origin}/api/public/discover?need=`,
                search: `${origin}/api/public/registry?q=`,
                bulk: `${origin}/api/public/entries.ndjson`,
              },
            },
            null,
            2,
          ),
          { headers },
        );
      },
    },
  },
});
