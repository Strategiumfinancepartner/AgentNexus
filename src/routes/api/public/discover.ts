import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { buildDiscovery, needTokens } from "@/lib/registry-core";
import { recordNeedSignal } from "@/lib/telemetry.server";
import { enforceQuota, quotaExceeded } from "@/lib/quota.server";

const corsBase = {
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

/**
 * Agents don't always read the schema before their first call. Accept the
 * obvious aliases (`q`, `query`) for `need` instead of bouncing a request
 * that's 95% correct.
 */
function withNeedAliases(input: unknown): unknown {
  if (typeof input !== "object" || input === null) return input;
  const obj = input as Record<string, unknown>;
  if (obj["need"]) return obj;
  const alias = obj["q"] ?? obj["query"];
  return alias ? { ...obj, need: alias } : obj;
}

/** Capability discovery: match a natural-language need to callable interfaces. */
async function discover(
  input: unknown,
  source: "api" | "mcp" | "web",
  extraHeaders: Record<string, string> = {},
) {
  const cors = { ...corsBase, ...extraHeaders };
  const parsed = querySchema.safeParse(withNeedAliases(input));
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid query. Required: need=<what you want to do> (at least 3 characters)",
        optional: ["category=api|mcp|cli", "min_reliability=0-100", "limit=1-20"],
        example: "/api/public/discover?need=send%20a%20transactional%20email",
        note: 'POST also accepts a JSON body, e.g. {"need": "send a transactional email"}.',
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
      OPTIONS: async () => new Response(null, { status: 204, headers: corsBase }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const quota = await enforceQuota(request);
        if (!quota.allowed) return quotaExceeded(quota, url.origin, corsBase);
        return discover(
          {
            need: url.searchParams.get("need") ?? "",
            category: url.searchParams.get("category") ?? undefined,
            min_reliability: url.searchParams.get("min_reliability") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
          },
          "api",
          quota.headers,
        );
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const quota = await enforceQuota(request);
        if (!quota.allowed) return quotaExceeded(quota, url.origin, corsBase);

        // Agents sometimes POST with an empty body and the query in the URL
        // (i.e. they treated this like GET). Try the body first, fall back
        // to the query string instead of rejecting a request that clearly
        // carries a need.
        const raw = await request.text();
        let body: unknown = {};
        if (raw.trim()) {
          try {
            body = JSON.parse(raw);
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
              status: 400,
              headers: corsBase,
            });
          }
        }
        if (typeof body === "object" && body !== null) {
          const obj = body as Record<string, unknown>;
          if (!obj["need"] && !obj["q"] && !obj["query"]) {
            const fromQuery = url.searchParams.get("need");
            if (fromQuery) obj["need"] = fromQuery;
          }
        }

        return discover(body, "api", quota.headers);
      },
    },
  },
});
