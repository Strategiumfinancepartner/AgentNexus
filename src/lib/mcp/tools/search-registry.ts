import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";
import { withKeyInvitation } from "../key-invitation";

export default defineTool({
  name: "search_registry",
  title: "Look up a service by name",
  description:
    "Search the Agent Nexus registry when you already know the service, product, vendor, slug or endpoint you are looking for. Use this for a targeted lookup, not for discovering a solution to a broad task; for a plain-language goal, use discover_capabilities instead. Matches literal text only and does not interpret intent. Optionally narrow the search by category. Returns {count, results[]} containing summary records with slug, name, category, summary, endpoint and trust fields. Results are alphabetical, not ranked by relevance. There is no pagination beyond the limit parameter: increase limit (maximum 50) or narrow the query when needed. Use get_entry to inspect the full record of a relevant result. An empty results[] is a valid answer, not an error. Read-only and side-effect free.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .max(120)
      .default("")
      .describe(
        "Literal substring, max 120 chars, matched case-insensitively against name, summary, endpoint and slug — a product name ('resend'), a vendor, a slug fragment or a host ('api.stripe.com'). Single terms work best: the whole string is matched as one substring, so 'send email' finds nothing unless those words appear together. The characters % , ( ) are stripped. An empty query (the default) returns the first entries in name order, which is a browse, not a search.",
      ),
    category: z
      .enum(["api", "mcp", "cli"])
      .optional()
      .describe(
        "Optional filter, exactly one of 'api', 'mcp' or 'cli' (see list_categories). Combined with query as AND. Omit to search all three layers.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe(
        "Upper bound on entries returned, 1-50, default 10. Results are ordered by name, not by relevance, so a small limit on a broad keyword can hide better matches — raise it or use discover_capabilities when you are ranking candidates.",
      ),
  },
  outputSchema: { count: z.number(), results: z.array(z.any()) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }) => {
    const supabase = supabaseAnon();
    let request = supabase
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(limit);

    if (category) request = request.eq("category", category);
    const term = query.replace(/[%,()]/g, " ").trim();
    if (term) {
      request = request.or(
        `name.ilike.%${term}%,summary.ilike.%${term}%,endpoint.ilike.%${term}%,slug.ilike.%${term}%`,
      );
    }

    const { data, error } = await request;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const results = data ?? [];
    // An empty query is a browse, not a search: only real lookups count.
    if (term) {
      const { recordAppearances } = await import("@/lib/appearances.server");
      await recordAppearances(results.map((r: any) => r?.slug), "mcp_search");
    }
    return withKeyInvitation({
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { count: results.length, results },
    });
  },
});
