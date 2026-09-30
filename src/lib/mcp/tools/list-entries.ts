import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "../supabase";

const PAGE_SIZE_MAX = 50;

export default defineTool({
  name: "list_entries",
  title: "List all registry entries (paginated)",
  description:
    "Enumerate the whole approved catalogue in deterministic slug order, page by page — use this when you want everything (mirroring, auditing, building your own index), not when you are looking for something specific. Read-only and idempotent. Returns {total, page, per_page, pages, results[]}: read 'pages' from the first response and increment 'page' until you reach it; 'total' and 'pages' reflect the 'category' filter when one is set, so keep the filter identical across pages or the paging shifts. Entries come back in summary form; call get_entry with a slug for the full record. For a keyword use search_registry, for a plain-language need use discover_capabilities, and for the accepted category values call list_categories. Bulk mirror alternative: GET https://agentnexus.app/api/public/entries.ndjson streams the full catalogue in one request.",
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
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
