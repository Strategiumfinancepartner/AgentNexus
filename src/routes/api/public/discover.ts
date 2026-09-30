import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { buildDiscovery, needTokens } from "@/lib/registry-core";
import { recordNeedSignal } from "@/lib/telemetry.server";
import { enforceQuota, quotaExceeded } from "@/lib/quota.server";
import {
  abuseBlockedResponse,
  isAbuseBlocked,
  looksLikeInjection,
  recordAbuseStrike,
} from "@/lib/abuse-guard.server";

const corsBase = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-Nexus-Tier, X-Nexus-Quota-Warning, X-Nexus-Free-Key",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

/**
 * Deliberately forgiving: an agent that misnames a field or sends a two-letter
 * need should still get an answer. Over-long needs are trimmed, out-of-range
 * numbers are clamped, and unknown categories are ignored rather than refused.
 */
const querySchema = z.object({
  need: z
    .string()
    .trim()
    .min(2)
    .transform((value) => value.slice(0, 300)),
  category: z.enum(["api", "mcp", "cli"]).optional(),
  min_reliability: z.coerce
    .number()
    .catch(0)
    .transform((n) => Math.min(Math.max(Math.trunc(n) || 0, 0), 100))
    .optional()
    .default(0),
  limit: z.coerce
    .number()
    .catch(5)
    .transform((n) => Math.min(Math.max(Math.trunc(n) || 5, 1), 20))
    .optional()
    .default(5),
});

const NEED_KEYS = [
  "need",
  "query",
  "q",
  "capability",
  "capabilities",
  "task",
  "prompt",
  "text",
  "search",
  "goal",
  "intent",
  "description",
  "need_description",
  "question",
];
const LIMIT_KEYS = ["limit", "max", "max_results", "maxResults", "top_k", "topK", "count", "n"];
const CATEGORY_KEYS = ["category", "type", "kind"];
const RELIABILITY_KEYS = ["min_reliability", "minReliability", "reliability"];

/** Accept the many body shapes agents send: aliases, nesting, bare strings, query params. */
function normalizeDiscoveryInput(body: unknown, url: URL): unknown {
  const candidates: Record<string, unknown>[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 3 || !value || typeof value !== "object" || Array.isArray(value)) return;
    const record = value as Record<string, unknown>;
    candidates.push(record);
    for (const key of ["input", "params", "arguments", "body", "data", "payload", "request"]) {
      visit(record[key], depth + 1);
    }
  };
  if (typeof body === "string") candidates.push({ need: body });
  else visit(body, 0);

  const pick = (keys: string[]) => {
    for (const record of candidates) {
      for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) return value.trim();
        if (typeof value === "number") return String(value);
        if (Array.isArray(value)) {
          const joined = value.filter((v) => typeof v === "string").join(" ").trim();
          if (joined.length > 0) return joined;
        }
      }
    }
    return undefined;
  };

  const need = pick(NEED_KEYS) ?? url.searchParams.get("need")?.trim() ?? "";
  const category = (pick(CATEGORY_KEYS) ?? url.searchParams.get("category") ?? undefined)
    ?.toLowerCase();
  return {
    need,
    category: category === "api" || category === "mcp" || category === "cli" ? category : undefined,
    min_reliability: pick(RELIABILITY_KEYS) ?? url.searchParams.get("min_reliability") ?? undefined,
    limit: pick(LIMIT_KEYS) ?? url.searchParams.get("limit") ?? undefined,
  };
}

/** Capability discovery: match a natural-language need to callable interfaces. */
async function discover(
  input: unknown,
  source: "api" | "mcp" | "web",
  extraHeaders: Record<string, string> = {},
  rejectDetail = "",
  request?: Request,
) {
  const cors = { ...corsBase, ...extraHeaders };
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) {
    // No usable need at all: answer with usage instead of an error, so a probe
    // or a mis-shaped call still learns how to ask. Status 200 on purpose.
    return new Response(
      JSON.stringify(
        {
          need: null,
          coverage: "no_query",
          count: 0,
          matches: [],
          how_to_ask: {
            hint: "Describe what you want to do, in plain language (2-300 chars).",
            accepted_fields: NEED_KEYS,
            optional: ["category=api|mcp|cli", "min_reliability=0-100", "limit=1-20"],
            example_get: "/api/public/discover?need=send%20a%20transactional%20email",
            example_post: { need: "send a transactional email", limit: 5 },
          },
          catalog: {
            categories: ["api", "mcp", "cli"],
            bulk_export: "/api/public/entries.ndjson",
            openapi: "/openapi.json",
            llms_txt: "/llms.txt",
          },
        },
        null,
        2,
      ),
      {
        // Kept for the ops log only; stripped before the response ships.
        headers: { ...cors, "x-nexus-error-detail": rejectDetail.slice(0, 280) },
      },
    );
  }
  const { need, category, min_reliability, limit } = parsed.data;

  // Injection-style payload (XSS/SQLi/template probe): never a real need.
  // Answer with a benign empty result, record a strike, skip the demand log —
  // at 3 strikes in 24h the address is refused at the door (see handlers).
  if (looksLikeInjection(need)) {
    if (request) void recordAbuseStrike(request);
    return new Response(
      JSON.stringify(
        {
          need,
          coverage: "none",
          count: 0,
          uncovered: true,
          matches: [],
          note: "No interface matches this need. Describe a task in plain language, e.g. 'send a transactional email'.",
        },
        null,
        2,
      ),
      { headers: cors },
    );
  }


  // Load the whole approved catalog: a hard cap silently drops later-added
  // entries (DeepL was invisible to "translate text" for that reason).
  let request_ = supabaseAnon()
    .from("entries")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .limit(2000);
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

  const body =
    extraHeaders["X-Nexus-Tier"] === "anon"
      ? {
          ...result,
          free_key: {
            why: "You are on 100 calls/day. A free key gives 1,000/day — no account, no email, 10 seconds.",
            call: 'curl -s -X POST https://agentnexus.app/api/public/keys -H "content-type: application/json" -d \'{"agent":"my-agent"}\'',
            human_page: "https://agentnexus.app/free-key",
          },
        }
      : result;
  return new Response(JSON.stringify(body, null, 2), { headers: cors });
}

export const Route = createFileRoute("/api/public/discover")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsBase }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (await isAbuseBlocked(request)) return abuseBlockedResponse(corsBase);
        const quota = await enforceQuota(request);
        if (!quota.allowed) return quotaExceeded(quota, url.origin, corsBase);
        // Same alias tolerance as POST: ?q=, ?query=, ?task= all work.
        const params = Object.fromEntries(url.searchParams.entries());
        return discover(
          normalizeDiscoveryInput(params, url),
          "api",
          quota.headers,
          `query=${url.search.slice(0, 200)}`,
          request,
        );
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        if (await isAbuseBlocked(request)) return abuseBlockedResponse(corsBase);
        const quota = await enforceQuota(request);
        if (!quota.allowed) return quotaExceeded(quota, url.origin, corsBase);
        let body: unknown = null;
        const raw = await request.text().catch(() => "");
        if (raw.trim().length > 0) {
          try {
            body = JSON.parse(raw);
          } catch {
            // Not JSON: treat the raw payload as the need itself.
            body = { need: raw };
          }
        }
        // Shape of what was sent, so a rejection tells us which field name to accept next.
        const shape =
          body && typeof body === "object" && !Array.isArray(body)
            ? `keys=${Object.keys(body as Record<string, unknown>).slice(0, 12).join(",")}`
            : `type=${typeof body}`;
        const detail = `${shape} raw=${raw.slice(0, 200)}`;
        return discover(normalizeDiscoveryInput(body, url), "api", quota.headers, detail, request);
      },
    },
  },
});
