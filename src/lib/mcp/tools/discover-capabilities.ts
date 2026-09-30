import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";
import { buildDiscovery, needTokens } from "@/lib/registry-core";

export default defineTool({
  name: "discover_capabilities",
  title: "Discover a callable interface for a need",
  description:
    "Map a plain-language goal (e.g. 'send a transactional email') to callable APIs, MCP servers or CLIs. Returns {need, coverage, count, uncovered, note, matches[]}; each match has slug, endpoint, auth, formats, rate limit, pricing and a 0-100 reliability score. Never empty on a valid need: if nothing fits, coverage='none' and matches[] lists reliable starting points. Errors: an invalid or too-short need fails input validation; a backend failure returns isError=true with the message. Rate limits: 100 calls/day anonymous, 1,000/day with a free key (POST /api/public/keys, no account), 50,000/day on Agent Pro. For a known keyword or slug, use search_registry.",
  inputSchema: {
    need: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .describe("What the agent is trying to accomplish, in plain language. 3-300 characters, required."),
    category: z
      .enum(["api", "mcp", "cli"])
      .optional()
      .describe("Restrict to one interface layer ('api', 'mcp' or 'cli' — see list_categories). Default: omitted, searches all three."),
    min_reliability: z
      .number()
      .int()
      .min(0)
      .max(100)
      .default(0)
      .describe("Drop interfaces scoring below this 0-100 reliability value. Default 0 (no filter)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Maximum number of matching interfaces to return, 1-20. Default 5."),
  },
  outputSchema: {
    need: z.string(),
    coverage: z.string(),
    count: z.number(),
    uncovered: z.boolean(),
    note: z.string(),
    matches: z.array(z.any()),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ need, category, min_reliability, limit }) => {
    // Injection-style payload (no client IP available here, so no strike):
    // answer with a benign empty result instead of serving or logging it.
    const { looksLikeInjection } = await import("@/lib/abuse-guard.server");
    if (looksLikeInjection(need)) {
      const empty = {
        need,
        coverage: "none",
        count: 0,
        uncovered: true,
        matches: [] as unknown[],
        note: "No interface matches this need. Describe a task in plain language, e.g. 'send a transactional email'.",
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(empty, null, 2) }],
        structuredContent: empty,
      };
    }

    const supabase = supabaseAnon();
    let request = supabase
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .limit(500);
    if (category) request = request.eq("category", category);

    const { data, error } = await request;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const tokens = needTokens(need);
    const result = buildDiscovery((data ?? []) as any[], {
      need,
      tokens,
      category: category ?? null,
      minReliability: min_reliability,
      limit,
    });

    const { recordNeedSignal } = await import("@/lib/telemetry.server");
    await recordNeedSignal({
      need,
      tokens,
      category: category ?? null,
      matchedCount: result.count,
      topSlug: result.count > 0 ? (result.matches[0]?.slug ?? null) : null,
      source: "mcp",
    });

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
