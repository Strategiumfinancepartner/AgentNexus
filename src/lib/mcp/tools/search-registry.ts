import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";

export default defineTool({
  name: "search_registry",
  title: "Search registry",
  description:
    "Search the Agent Nexus registry of approved APIs, MCP servers and CLIs by keyword and optional category.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .max(120)
      .default("")
      .describe("Keyword matched against name, summary, endpoint or slug."),
    category: z
      .enum(["api", "mcp", "cli"])
      .optional()
      .describe("Restrict results to one interface category."),
    limit: z.number().int().min(1).max(50).default(10),
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
