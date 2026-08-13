import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

type Row = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  auth_mode: string;
  endpoint: string;
  docs_url: string | null;
  tags: string[];
  health_ok: boolean | null;
  health_checked_at: string | null;
};

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const { data, error } = await supabaseAnon()
          .from("entries")
          .select(
            "slug, name, category, summary, auth_mode, endpoint, docs_url, tags, health_ok, health_checked_at",
          )
          .eq("status", "approved")
          .order("category", { ascending: true })
          .order("name", { ascending: true })
          .limit(500);

        const rows = (error ? [] : ((data ?? []) as Row[])) as Row[];
        const byCategory: Record<string, Row[]> = { api: [], mcp: [], cli: [] };
        for (const row of rows) (byCategory[row.category] ??= []).push(row);

        const section = (key: string, title: string) => {
          const items = byCategory[key] ?? [];
          if (items.length === 0) return "";
          const lines = items.map((r) => {
            const health =
              r.health_ok === null
                ? "unknown"
                : r.health_ok
                  ? `up${r.health_checked_at ? ` (${r.health_checked_at})` : ""}`
                  : "down";
            return [
              `- [${r.name}](${origin}/api/public/registry/${r.slug}): ${r.summary}`,
              `  endpoint: ${r.endpoint}`,
              `  auth: ${r.auth_mode}`,
              `  tags: ${(r.tags ?? []).join(", ") || "-"}`,
              `  health: ${health}`,
              r.docs_url ? `  docs: ${r.docs_url}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          });
          return `## ${title}\n\n${lines.join("\n")}\n\n`;
        };

        const body = `# Agent Nexus

> A machine-readable registry of the interfaces AI agents call: HTTP APIs, MCP servers and CLIs.
> Every entry is human-reviewed and health-checked. Use the JSON API or the MCP server below — no scraping required.

## Machine interfaces

- MCP server (Streamable HTTP): ${origin}/mcp
  tools: search_registry, get_entry, list_categories
- JSON list: ${origin}/api/public/registry?q=&category=api|mcp|cli&limit=50
- JSON entry: ${origin}/api/public/registry/{slug}
- This file: ${origin}/llms.txt

${section("api", "APIs")}${section("mcp", "MCP servers")}${section("cli", "CLIs")}## Notes

- Only approved entries are exposed publicly.
- health: result of the latest automated endpoint probe (${rows.length} entries listed).
`;

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
