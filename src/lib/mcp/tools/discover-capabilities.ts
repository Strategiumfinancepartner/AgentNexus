import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";
import { matchScore, needTokens, reliability } from "@/lib/registry-core";

export default defineTool({
  name: "discover_capabilities",
  title: "Discover a callable interface for a need",
  description:
    "Match a natural-language need (e.g. 'send a transactional email', 'query Postgres') to the interfaces that can do it, ranked by capability match and verified reliability. Returns everything needed to call them: endpoint, auth mode, auth parameters, formats, rate limit and cost.",
  inputSchema: {
    need: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .describe("What the agent is trying to accomplish, in plain language."),
    category: z
      .enum(["api", "mcp", "cli"])
      .optional()
      .describe("Restrict to one interface layer."),
    min_reliability: z
      .number()
      .int()
      .min(0)
      .max(100)
      .default(0)
      .describe("Drop interfaces whose reliability score is below this value."),
    limit: z.number().int().min(1).max(20).default(5),
  },
  outputSchema: { need: z.string(), count: z.number(), matches: z.array(z.any()) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ need, category, min_reliability, limit }) => {
    const supabase = supabaseAnon();
    let request = supabase
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .limit(300);
    if (category) request = request.eq("category", category);

    const { data, error } = await request;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
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

    const { recordNeedSignal } = await import("@/lib/telemetry.server");
    await recordNeedSignal({
      need,
      tokens,
      category: category ?? null,
      matchedCount: matches.length,
      topSlug: matches[0]?.slug ?? null,
      source: "mcp",
    });

    return {
      content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
      structuredContent: { need, count: matches.length, matches },
    };

  },
});
