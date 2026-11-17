import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";
import { withKeyInvitation } from "../key-invitation";

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
    "Retrieve the Agent Nexus catalogue categories and their current counts of approved entries. Use this when you need to understand the taxonomy, learn the accepted 'category' values or prepare a catalogue exploration. The three interface layers are api, mcp and cli. Call once when category information is needed; this tool does not return individual services. Use discover_capabilities to find a service for a task, search_registry for a known keyword, or list_entries to enumerate entries. Read-only, idempotent and parameterless.",
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

    return withKeyInvitation({
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { categories },
    });
  },
});
