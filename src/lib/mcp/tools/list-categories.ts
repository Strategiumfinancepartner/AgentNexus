import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { categories, registry } from "../../registry";

export default defineTool({
  name: "list_categories",
  title: "List interface categories",
  description:
    "List the three interface layers Agent Nexus indexes (APIs, MCPs, CLIs) with entry counts.",
  inputSchema: {},
  outputSchema: { categories: z.array(z.any()) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const data = categories.map((c) => ({
      id: c.id,
      label: c.label,
      layer: c.line,
      description: c.blurb,
      count: registry.filter((e) => e.category === c.id).length,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { categories: data },
    };
  },
});
