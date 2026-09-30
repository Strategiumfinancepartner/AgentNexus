import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { enforceQuota, quotaExceeded } from "@/lib/quota.server";

const corsBase = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier, X-Nexus-Quota-Warning, X-Nexus-Free-Key",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const querySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.enum(["api", "mcp", "cli"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const Route = createFileRoute("/api/public/registry")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsBase }),
      // Some crawlers POST a JSON body ({"q":..,"limit":..}) instead of query
      // params: fold the body into the URL and answer like GET.
      POST: async ({ request }) => {
        const url = new URL(request.url);
        try {
          const body = await request.json();
          if (body && typeof body === "object" && !Array.isArray(body)) {
            for (const k of ["q", "query", "search", "category", "limit"]) {
              const v = (body as Record<string, unknown>)[k];
              if (v != null && typeof v !== "object") {
                url.searchParams.set(k === "query" || k === "search" ? "q" : k, String(v));
              }
            }
          }
        } catch {
          /* empty or non-JSON body: default listing */
        }
        return handleList(new Request(url, { headers: request.headers }));
      },
      GET: async ({ request }) => handleList(request),
    },
  },
});

async function handleList(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const quota = await enforceQuota(request);
        if (!quota.allowed) return quotaExceeded(quota, url.origin, corsBase);
        const cors = { ...corsBase, ...quota.headers };
        // Crawlers and agents probe with placeholder values ("limit=N",
        // "category=*"). Fall back to the defaults instead of a bare 400 so the
        // call still returns a useful catalogue page.
        const rawCategory = (url.searchParams.get("category") ?? "").trim().toLowerCase();
        const rawLimit = Number(url.searchParams.get("limit"));
        const parsed = querySchema.safeParse({
          q: (url.searchParams.get("q") ?? "").slice(0, 120) || undefined,
          category: ["api", "mcp", "cli"].includes(rawCategory) ? rawCategory : undefined,
          limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : undefined,
        });
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid query parameters" }), {
            status: 400,
            headers: cors,
          });
        }
        const { q, category, limit } = parsed.data;

        let query = supabaseAnon()
          .from("entries")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .order("name", { ascending: true })
          .limit(limit);
        if (category) query = query.eq("category", category);
        const term = q.replace(/[%,()]/g, " ").trim();
        if (term) {
          query = query.or(
            `name.ilike.%${term}%,summary.ilike.%${term}%,endpoint.ilike.%${term}%,slug.ilike.%${term}%`,
          );
        }

        const { data, error } = await query;
        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers: cors,
          });
        }
        const results = data ?? [];
        return new Response(
          JSON.stringify({
            count: results.length,
            results,
            docs: `${url.origin}/llms.txt`,
            mcp: `${url.origin}/mcp`,
            // Pre-exhaustion notice (fires at 90% of the daily quota), so heavy
            // callers learn their upgrade options before the hard 429.
            ...(quota.warning ? { quota_notice: quota.warning } : {}),
          }),
          { headers: cors },
        );
}
