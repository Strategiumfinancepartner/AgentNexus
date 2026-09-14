import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { buildDiscovery, needTokens } from "@/lib/registry-core";
import { recordNeedSignal } from "@/lib/telemetry.server";
import { enforceQuota, quotaExceeded } from "@/lib/quota.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const querySchema = z.object({
  need: z.string().trim().min(3).max(300),
  category: z.enum(["api", "mcp", "cli"]).optional(),
  min_reliability: z.coerce.number().int().min(0).max(100).optional().default(0),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

/** Capability discovery: match a natural-language need to callable interfaces. */
async function discover(input: unknown, source: "api" | "mcp" | "web") {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query. Required: ?need=<what you want to do>",
        optional: ["category=api|mcp|cli", "min_reliability=0-100", "limit=1-20"],
        example: "/api/public/discover?need=send%20a%20transactional%20email",
      }),
      { status: 400, headers: cors },
    );
  }
  const { need, category, min_reliability, limit } = parsed.data;

  let request_ = supabaseAnon()
    .from("entries")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .limit(500);
  if (category) request_ = request_.eq("category", category);

  const { data, error } = await request_;
  if (error) {
    return new Response(JSON.stringify({ error: "Registry unavailable" }), {
      status: 502,
      headers: cors,
    });
  }

  const tokens = needTokens(need);
  const result = buildDiscovery((data ?? []) as any[], {
    need,
    tokens,
    category: category ?? null,
    minReliability: min_reliability,
    limit,
  });

  await recordNeedSignal({
    need,
    tokens,
    category: category ?? null,
    matchedCount: result.count,
    topSlug: result.count > 0 ? (result.matches[0]?.slug ?? null) : null,
    source,
  });

  return new Response(JSON.stringify(result, null, 2), { headers: cors });
}

export const Route = createFileRoute("/api/public/discover")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return discover(
          {
            need: url.searchParams.get("need") ?? "",
            category: url.searchParams.get("category") ?? undefined,
            min_reliability: url.searchParams.get("min_reliability") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
          },
          "api",
        );
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: cors,
          });
        }
        return discover(body, "api");
      },
    },
  },
});
