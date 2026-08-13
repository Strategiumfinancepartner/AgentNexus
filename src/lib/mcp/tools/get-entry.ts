import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { registry } from "../../registry";

export default defineTool({
  name: "get_entry",
  title: "Get registry entry",
  description:
    "Fetch one Agent Nexus registry entry by slug, including its endpoint and auth method.",
  inputSchema: { slug: z.string().trim().min(1).describe("Entry slug, e.g. 'stripe-api'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ slug }) => {
    const entry = registry.find((e) => e.slug === slug);
    if (!entry) {
      throw new ToolError(
        `No entry with slug "${slug}". Use search_registry to list available slugs.`,
      );
    }
    return {
      content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
      structuredContent: { entry },
    };
  },
});
