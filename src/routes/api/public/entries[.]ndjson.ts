import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { enforceQuota, quotaExceeded } from "@/lib/quota.server";

const baseHeaders = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier",
  "Cache-Control": "no-store",
};

/**
 * Bulk feed: one JSON object per line. Cheap for pipelines that want to embed,
 * index or mirror the whole catalog without paginating.
 */
export const Route = createFileRoute("/api/public/entries.ndjson")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: baseHeaders }),
      GET: async ({ request }) => {
        const quota = await enforceQuota(request);
        if (!quota.allowed)
          return quotaExceeded(quota, new URL(request.url).origin, {
            ...baseHeaders,
            "Content-Type": "application/json",
          });
        const headers = { ...baseHeaders, ...quota.headers };
        const { data, error } = await supabaseAnon()
          .from("entries")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .order("category", { ascending: true })
          .order("name", { ascending: true })
          .limit(1000);

        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }

        const body = (data ?? []).map((row) => JSON.stringify(row)).join("\n");
        return new Response(body ? `${body}\n` : "", { headers });
      },
    },
  },
});
