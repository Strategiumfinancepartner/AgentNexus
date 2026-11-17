import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";
import { withKeyInvitation } from "../key-invitation";

const PAGE_SIZE_MAX = 50;

export default defineTool({
  name: "list_entries",
  title: "List all registry entries (paginated)",
  description:
    "Enumerate the approved Agent Nexus catalogue page by page. Use this for catalogue exploration, auditing, mirroring or building your own service index; do not use it as the default search method when solving a specific task. For a specific service or keyword, use search_registry; for a plain-language capability or task, use discover_capabilities. Returns {total, page, per_page, pages, results[]} in deterministic slug order. Read 'pages' from the first response and increment 'page' until all pages have been retrieved; keep the category filter identical across pages. Results are summary records; use get_entry for the full details of one service. For a complete bulk export, use GET https://agentnexus.app/api/public/entries.ndjson. Read-only and idempotent.",
  inputSchema: {
    page: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe(
        "1-based page index. Start at 1 and increment until it equals the 'pages' value returned in the response; a page beyond the last one returns an empty results[] rather than an error.",
      ),
    per_page: z
      .number()
      .int()
      .min(1)
      .max(PAGE_SIZE_MAX)
      .default(25)
      .describe(
        `How many entries to return in this page, 1-${PAGE_SIZE_MAX}, default 25. Changing it between calls changes 'pages' and re-slices the catalogue, so keep it constant while paging.`,
      ),
    category: z
      .enum(["api", "mcp", "cli"])
      .optional()
      .describe(
        "Optional filter, exactly one of 'api', 'mcp' or 'cli' (see list_categories). Omit to page through all three layers. When set, 'total' and 'pages' count only that layer.",
      ),
  },
  outputSchema: {
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    pages: z.number(),
    results: z.array(z.any()),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ page, per_page, category }) => {
    const supabase = supabaseAnon();

    let countQuery = supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");
    if (category) countQuery = countQuery.eq("category", category);
    const { count, error: countError } = await countQuery;
    if (countError) {
      return { content: [{ type: "text", text: countError.message }], isError: true };
    }

    const total = count ?? 0;
    const pages = Math.max(1, Math.ceil(total / per_page));
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let request = supabase
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .order("slug", { ascending: true })
      .range(from, to);
    if (category) request = request.eq("category", category);

    const { data, error } = await request;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const results = data ?? [];
    const payload = { total, page, per_page, pages, results };
    return withKeyInvitation({
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    });
  },
});
