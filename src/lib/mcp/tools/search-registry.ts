import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { registry } from "../../registry";

export default defineTool({
  name: "search_registry",
  title: "Search registry",
  description:
    "Search the Agent Nexus registry of APIs, MCP servers and CLIs by keyword and optional category.",
  inputSchema: {
    query: z.string().trim().default("").describe("Keyword to match against name, summary or tags."),
    category: z
      .enum(["api", "mcp", "cli"])
      .optional()
      .describe("Restrict results to one interface category."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  outputSchema: {
    count: z.number(),
    results: z.array(z.any()),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, category, limit }) => {
    const q = query.toLowerCase();
    const results = registry
      .filter((e) => (category ? e.category === category : true))
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q)),
      )
      .slice(0, limit);

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});
