import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";

export default defineTool({
  name: "search_registry",
  title: "Search registry",
  description:
    "Keyword lookup in the Agent Nexus registry when you already know what to look for: a product name, vendor, slug or endpoint fragment, optionally narrowed to one category. Matches literal text only — it does not interpret a goal. To go from a plain-language need to a callable interface, use discover_capabilities instead; to walk the whole catalogue in order use list_entries, and for the full record of one known slug use get_entry. Read-only and side-effect free. Returns {count, results[]} where each result is a summary entry record (slug, name, category, summary, endpoint, trust fields). Results are ordered alphabetically by name, not by relevance; there is no pagination beyond the limit parameter — raise limit (max 50) or narrow the query to see more. An empty results[] when nothing matches is a valid answer, not an error.",
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
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});
