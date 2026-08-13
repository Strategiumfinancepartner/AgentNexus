import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_entry",
  title: "Get registry entry",
  description:
    "Fetch one approved Agent Nexus registry entry by slug, including its endpoint, auth method and last health probe.",
  inputSchema: {
    slug: z.string().trim().min(1).max(80).describe("Entry slug, e.g. 'stripe-api'."),
  },
  outputSchema: { entry: z.any() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const supabase = supabaseAnon();
    const { data, error } = await supabase
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      throw new ToolError(
        `No approved entry with slug "${slug}". Use search_registry to list available slugs.`,
      );
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { entry: data },
    };
  },
});
