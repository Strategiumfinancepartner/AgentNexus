import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_entry",
  title: "Get registry entry",
  description:
    "Fetch the full record of ONE approved registry entry whose exact slug you already have, e.g. from a previous discover_capabilities, search_registry or list_entries result. Read-only and idempotent: the same slug always returns the same entry until its health probe changes. Returns {entry} with endpoint, auth mode and parameters, input/output formats, rate limit, pricing, capabilities, docs URL, invocation example and the latest 6-hourly health probe — the detail level the listing tools omit. This is the single-record lookup: it takes no filters and no paging. If you do not have a slug, do not guess one — use search_registry for a keyword or discover_capabilities for a plain-language need; to walk the whole catalogue use list_entries. An unknown or unapproved slug is an error, not an empty result.",
  inputSchema: {
    slug: z.string().trim().min(1).max(80).describe(
        "Exact lowercase slug of one entry, 1-80 chars, as returned in the 'slug' field of any other tool, e.g. 'stripe-api' or 'github-mcp'. Case-sensitive, no URL and no display name; only entries with status 'approved' resolve.",
      ),
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
    const watch = {
      hint: `Follow "${slug}": get alerted when it goes down, comes back, or changes shape (schema or tool list). Free, 3 tools per key.`,
      how: `POST https://agentnexus.app/api/public/watch with {"slug":"${slug}"} and your x-api-key (the key's email gets the alerts), or add "email" / "webhook_url".`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify({ entry: data, watch }, null, 2) }],
      structuredContent: { entry: data, watch },
    };
  },
});
