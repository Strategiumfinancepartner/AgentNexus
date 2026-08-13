import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { matchScore, needTokens, reliability } from "@/lib/registry-core";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
};

const querySchema = z.object({
  need: z.string().trim().min(3).max(300),
  category: z.enum(["api", "mcp", "cli"]).optional(),
  min_reliability: z.coerce.number().int().min(0).max(100).optional().default(0),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

/** Capability discovery: match a natural-language need to callable interfaces. */
export const Route = createFileRoute("/api/public/discover")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          need: url.searchParams.get("need") ?? "",
          category: url.searchParams.get("category") ?? undefined,
          min_reliability: url.searchParams.get("min_reliability") ?? undefined,
          limit: url.searchParams.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: "Invalid query. Required: ?need=<what you want to do>",
              optional: ["category=api|mcp|cli", "min_reliability=0-100", "limit=1-20"],
            }),
            { status: 400, headers: cors },
          );
        }
        const { need, category, min_reliability, limit } = parsed.data;

        let request_ = supabaseAnon()
          .from("entries")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .limit(300);
        if (category) request_ = request_.eq("category", category);

        const { data, error } = await request_;
        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers: cors,
          });
        }

        const tokens = needTokens(need);
        const matches = ((data ?? []) as any[])
          .map((entry) => ({ entry, score: matchScore(entry, tokens), rel: reliability(entry) }))
          .filter(({ score, rel }) => score > 0 && (rel.score ?? 0) >= min_reliability)
          .sort((a, b) => b.score - a.score || (b.rel.score ?? 0) - (a.rel.score ?? 0))
          .slice(0, limit)
          .map(({ entry, score, rel }) => ({
            slug: entry.slug,
            name: entry.name,
            category: entry.category,
            summary: entry.summary,
            match_score: score,
            capabilities: entry.capabilities ?? [],
            call: {
              endpoint: entry.endpoint,
              auth_mode: entry.auth_mode,
              auth_params: entry.auth_params ?? [],
              input_format: entry.input_format || null,
              output_format: entry.output_format || null,
              rate_limit: entry.rate_limit || null,
              pricing: entry.pricing || null,
              example: entry.invocation_example || null,
              docs_url: entry.docs_url,
            },
            trust: {
              verified: Boolean(entry.verified),
              reliability_score: rel.score,
              uptime: rel.uptime,
              samples: rel.samples,
              avg_latency_ms: rel.avgLatencyMs,
              last_probe_ok: entry.health_ok,
              last_probe_at: entry.health_checked_at,
            },
          }));

        return new Response(
          JSON.stringify({ need, count: matches.length, matches }, null, 2),
          { headers: cors },
        );
      },
    },
  },
});
