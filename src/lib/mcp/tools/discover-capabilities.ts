import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";
import { buildDiscovery, needTokens } from "@/lib/registry-core";

export default defineTool({
  name: "discover_capabilities",
  title: "Discover a callable interface for a need",
  description:
    "Match a natural-language need (e.g. 'send a transactional email', 'query Postgres') to the interfaces that can do it, ranked by capability match and verified reliability. Returns everything needed to call them: endpoint, auth mode, auth parameters, formats, rate limit and cost. Always returns a payload: when nothing matches, `coverage` is 'none', `uncovered` is true and the entries returned are reliable starting points, not matches.",
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
