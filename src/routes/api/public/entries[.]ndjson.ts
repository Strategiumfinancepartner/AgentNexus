import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";

const headers = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

/**
 * Bulk feed: one JSON object per line. Cheap for pipelines that want to embed,
 * index or mirror the whole catalog without paginating.
 */
export const Route = createFileRoute("/api/public/entries.ndjson")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async () => {
        const { data, error } = await supabaseAnon()
          .from("entries")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .order("category", { ascending: true })
          .order("name", { ascending: true })
          .limit(1000);

        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }

        const body = (data ?? []).map((row) => JSON.stringify(row)).join("\n");
        return new Response(body ? `${body}\n` : "", { headers });
      },
    },
  },
});
