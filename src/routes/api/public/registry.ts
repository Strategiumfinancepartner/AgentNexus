import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
};

const querySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  category: z.enum(["api", "mcp", "cli"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const Route = createFileRoute("/api/public/registry")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          q: url.searchParams.get("q") ?? undefined,
          category: url.searchParams.get("category") ?? undefined,
          limit: url.searchParams.get("limit") ?? undefined,
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
          }),
          { headers: cors },
        );
      },
    },
  },
});
