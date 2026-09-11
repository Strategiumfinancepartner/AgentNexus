import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

type Row = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  endpoint: string;
  created_at: string | null;
};

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** RSS of newly approved interfaces: pollable by crawlers and watcher agents. */
export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const { data } = await supabaseAnon()
          .from("entries")
          .select("slug, name, category, summary, endpoint, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(50);

        const rows = (data ?? []) as Row[];
        const items = rows
          .map(
            (r) => `    <item>
      <title>${escape(`${r.name} (${r.category})`)}</title>
      <link>${origin}/api/public/registry/${r.slug}</link>
      <guid isPermaLink="false">agent-nexus:${r.slug}</guid>
      <description>${escape(`${r.summary} — endpoint: ${r.endpoint}`)}</description>
      ${r.created_at ? `<pubDate>${new Date(r.created_at).toUTCString()}</pubDate>` : ""}
    </item>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Agent Nexus — new interfaces</title>
    <link>${origin}/explore</link>
    <description>Newly approved APIs, MCP servers and CLIs that AI agents can call.</description>
${items}
  </channel>
</rss>
`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
