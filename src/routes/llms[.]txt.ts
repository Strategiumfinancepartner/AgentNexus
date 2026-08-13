import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";
import { reliability } from "@/lib/registry-core";

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
  capabilities: string[] | null;
  auth_params: { name: string; location: string; required: boolean }[] | null;
  input_format: string | null;
  output_format: string | null;
  rate_limit: string | null;
  pricing: string | null;
  invocation_example: string | null;
  verified: boolean | null;
  featured: boolean | null;
  checks_total: number;
  checks_ok: number;
  avg_latency_ms: number | null;
};

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const { data, error } = await supabaseAnon()
          .from("entries")
          .select(PUBLIC_COLUMNS)
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
            const rel = reliability({
              checks_total: r.checks_total ?? 0,
              checks_ok: r.checks_ok ?? 0,
              avg_latency_ms: r.avg_latency_ms,
              health_ok: r.health_ok,
              verified: Boolean(r.verified),
            });
            return [
              `- [${r.name}](${origin}/api/public/registry/${r.slug}): ${r.summary}`,
              `  endpoint: ${r.endpoint}`,
              `  auth: ${r.auth_mode}`,
              (r.auth_params ?? []).length
                ? `  auth_params: ${(r.auth_params ?? []).map((p) => `${p.name} in ${p.location}`).join(", ")}`
                : "",
              (r.capabilities ?? []).length
                ? `  capabilities: ${(r.capabilities ?? []).join(", ")}`
                : "",
              r.input_format || r.output_format
                ? `  formats: ${r.input_format || "-"} -> ${r.output_format || "-"}`
                : "",
              r.rate_limit ? `  rate_limit: ${r.rate_limit}` : "",
              r.pricing ? `  pricing: ${r.pricing}` : "",
              `  tags: ${(r.tags ?? []).join(", ") || "-"}`,
              `  health: ${health}`,
              `  reliability: ${rel.score === null ? "unproven" : `${rel.score}/100 (${rel.grade}, ${rel.samples} probes)`}${r.verified ? ", verified" : ""}`,
              r.invocation_example
                ? `  example: ${r.invocation_example.replace(/\s+/g, " ").slice(0, 200)}`
                : "",
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
  tools: discover_capabilities, search_registry, get_entry, list_categories, submit_entry, vote_entry, list_my_submissions
  auth: OAuth 2.1 with dynamic client registration
- Capability discovery (no auth): ${origin}/api/public/discover?need=send+an+email&limit=5
- JSON list: ${origin}/api/public/registry?q=&category=api|mcp|cli&limit=50
- JSON entry: ${origin}/api/public/registry/{slug}
- This file: ${origin}/llms.txt

${section("api", "APIs")}${section("mcp", "MCP servers")}${section("cli", "CLIs")}## Notes

- Only approved entries are exposed publicly.
- health: result of the latest automated endpoint probe (${rows.length} entries listed).
- reliability: 0-100 score from uptime, latency and human verification.
- verified: a reviewer called the interface and confirmed it behaves as described.
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
