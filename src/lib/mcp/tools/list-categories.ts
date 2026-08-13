import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const LAYERS = [
  {
    id: "api" as const,
    label: "APIs",
    description: "HTTP contracts an agent calls directly, without a browser.",
  },
  {
    id: "mcp" as const,
    label: "MCP servers",
    description: "Tool servers that expose typed capabilities over the Model Context Protocol.",
  },
  {
    id: "cli" as const,
    label: "CLIs",
    description: "Command-line surfaces: scriptable, composable, no UI to parse.",
  },
];

export default defineTool({
  name: "list_categories",
  title: "List interface categories",
  description:
    "List the three interface layers Agent Nexus indexes (APIs, MCPs, CLIs) with the number of approved entries in each.",
  inputSchema: {},
  outputSchema: { categories: z.array(z.any()) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase
      .from("entries")
      .select("category")
      .eq("status", "approved");

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const rows = (data ?? []) as { category: string }[];
    const categories = LAYERS.map((layer) => ({
      ...layer,
      count: rows.filter((r) => r.category === layer.id).length,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { categories },
    };
  },
});
