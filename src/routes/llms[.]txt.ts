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
          .limit(2000);

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
              // The URL is emitted on its own line, never inside markdown
              // parentheses: naive URL extractors captured `.../slug):` from a
              // `[name](url): summary` line and hammered a broken address.
              `- ${r.name} — ${r.summary}`,
              `  slug: ${r.slug}`,
              `  registry: ${origin}/api/public/registry/${r.slug}`,
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

> A machine-readable registry of ${rows.length} interfaces AI agents call: HTTP APIs, MCP servers and CLIs.
> Every entry is human-reviewed and health-checked on a rolling daily schedule. Use the JSON API or the MCP server below — no scraping required.

**Want your product listed?** Get a free key (POST ${origin}/api/public/keys), then call the MCP tool \`submit_entry\` on ${origin}/api/public/mcp with the header x-api-key: <your key>. One key is enough — creating more keys does not submit anything. Required fields: name, category (api|mcp|cli), summary, endpoint. Submissions are human-reviewed.

## Take the whole catalogue in one call (no auth)

    curl -s ${origin}/api/public/entries.ndjson

One JSON object per line: endpoint, auth parameters, formats, rate limits, live health and a 0-100 reliability score.
Companion surfaces, all anonymous:

- Newly approved interfaces (RSS): ${origin}/feed.xml
- Capability vocabulary — what agents actually ask for: ${origin}/api/public/capabilities
- Uptime history: ${origin}/api/public/status
- OpenAPI 3.1 spec: ${origin}/openapi.json

Registries, observatories and datasets are welcome to mirror these surfaces instead of re-probing
${rows.length} services — please cite agentnexus.app as the source.

## Get a key in one call (no account, no email, no human)

    curl -s -X POST ${origin}/api/public/keys \\
      -H 'content-type: application/json' \\
      -d '{"agent":"my-agent","purpose":"tool discovery"}'

Send the returned key as the x-api-key header on any ${origin}/api/public/* request.
Quotas: 100 calls/day anonymous, 1000/day with a free key, 50000/day on Agent Pro (${origin}/pricing).

## Drift alerts for the tools you depend on (needs a key)

    curl -s -X POST ${origin}/api/public/watch \\
      -H 'content-type: application/json' -H 'x-api-key: <your key>' \\
      -d '{"slug":"groq-api","email":"you@example.com"}'

You are alerted when the tool goes down, comes back, or changes shape (response schema or advertised tools/list: names, descriptions, input schemas). Free key: 3 tools by email. Agent Pro: 100 tools + webhook_url.


## Machine interfaces

- MCP server, read-only, NO AUTH (Streamable HTTP): ${origin}/api/public/mcp
  tools: discover_capabilities, search_registry, get_entry, list_entries, list_categories, submit_entry
  auth: none — connect headlessly, no human consent step (submit_entry requires a free self-service key)
- MCP server, full (Streamable HTTP): ${origin}/mcp
  tools: the read tools plus submit_entry, vote_entry, report_invocation, list_my_submissions
  auth: OAuth 2.1 with dynamic client registration
- Self-service API key (no human, no email): POST ${origin}/api/public/keys {"agent":"your-name"}
  send it as the x-api-key header to raise your daily quota

## Recommended agent flow

1. discover_capabilities(need) or GET /api/public/discover?need=... — resolve a need to candidate interfaces.
2. get_entry(slug) or GET /api/public/registry/{slug} — read the full contract: endpoint, auth, limits, live health.
3. Call the interface itself (Agent Nexus is a registry, not a proxy).
4. report_invocation(slug, outcome) or POST /api/public/report — close the loop; reliability scores are built from these reports.
- Capability discovery (no auth): ${origin}/api/public/discover?need=send+an+email&limit=5
- JSON list: ${origin}/api/public/registry?q=&category=api|mcp|cli&limit=50
- JSON entry: ${origin}/api/public/registry/{slug}
- Capability vocabulary: ${origin}/api/public/capabilities
- Bulk catalog (NDJSON): ${origin}/api/public/entries.ndjson
- Public uptime history: ${origin}/api/public/status (per interface: ?slug={slug})
- Invocation feedback: POST ${origin}/api/public/report
- OpenAPI 3.1 spec: ${origin}/openapi.json
- Plugin manifest: ${origin}/.well-known/ai-plugin.json
- A2A agent card: ${origin}/.well-known/agent.json (also /.well-known/agent-card.json)
- MCP discovery: ${origin}/.well-known/mcp.json and ${origin}/server.json
- New entries feed: ${origin}/feed.xml
- Short directive file: ${origin}/agents.txt
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
