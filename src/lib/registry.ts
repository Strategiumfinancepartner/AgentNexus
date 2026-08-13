export type Entry = {
  slug: string;
  name: string;
  category: "api" | "mcp" | "cli";
  summary: string;
  auth: string;
  endpoint: string;
  tags: string[];
};

export const registry: Entry[] = [
  {
    slug: "stripe-api",
    name: "Stripe",
    category: "api",
    summary: "Payments, subscriptions, invoices. Idempotent writes, cursor pagination.",
    auth: "Bearer secret key",
    endpoint: "https://api.stripe.com/v1",
    tags: ["payments", "billing"],
  },
  {
    slug: "notion-api",
    name: "Notion",
    category: "api",
    summary: "Pages, databases and blocks as structured JSON. Rate limit ~3 req/s.",
    auth: "Bearer integration token",
    endpoint: "https://api.notion.com/v1",
    tags: ["docs", "knowledge"],
  },
  {
    slug: "resend-api",
    name: "Resend",
    category: "api",
    summary: "Transactional email with a single POST. Ideal for agent side effects.",
    auth: "Bearer API key",
    endpoint: "https://api.resend.com/emails",
    tags: ["email"],
  },
  {
    slug: "linear-api",
    name: "Linear",
    category: "api",
    summary: "GraphQL issue tracker. Strong schema, great for planning agents.",
    auth: "API key header",
    endpoint: "https://api.linear.app/graphql",
    tags: ["issues", "graphql"],
  },
  {
    slug: "supabase-mcp",
    name: "Supabase MCP",
    category: "mcp",
    summary: "Query and mutate Postgres, inspect schema, manage projects over MCP.",
    auth: "OAuth 2.1 / PAT",
    endpoint: "https://mcp.supabase.com/mcp",
    tags: ["database", "sql"],
  },
  {
    slug: "github-mcp",
    name: "GitHub MCP",
    category: "mcp",
    summary: "Repos, issues, pull requests and code search as first-class tools.",
    auth: "OAuth 2.1",
    endpoint: "https://api.githubcopilot.com/mcp",
    tags: ["code", "vcs"],
  },
  {
    slug: "sentry-mcp",
    name: "Sentry MCP",
    category: "mcp",
    summary: "Error groups, stack traces and release health for debugging agents.",
    auth: "OAuth 2.1",
    endpoint: "https://mcp.sentry.dev/mcp",
    tags: ["observability"],
  },
  {
    slug: "gh-cli",
    name: "gh",
    category: "cli",
    summary: "GitHub from the shell. `gh pr create`, `gh issue list --json` for parsing.",
    auth: "gh auth login",
    endpoint: "gh <command> --json",
    tags: ["vcs", "json-output"],
  },
  {
    slug: "psql-cli",
    name: "psql",
    category: "cli",
    summary: "Direct SQL access. `psql -c \"...\" --csv` gives agent-parseable output.",
    auth: "connection string",
    endpoint: "psql $DATABASE_URL -c",
    tags: ["database"],
  },
  {
    slug: "ffmpeg-cli",
    name: "ffmpeg",
    category: "cli",
    summary: "Media transcoding an agent can drive deterministically from a prompt.",
    auth: "none",
    endpoint: "ffmpeg -i in.mp4 out.webm",
    tags: ["media"],
  },
  {
    slug: "curl-cli",
    name: "curl",
    category: "cli",
    summary: "The universal fallback when no SDK or MCP server exists yet.",
    auth: "per target",
    endpoint: "curl -sS -H 'Authorization: ...'",
    tags: ["http"],
  },
  {
    slug: "cloudflare-mcp",
    name: "Cloudflare MCP",
    category: "mcp",
    summary: "Workers, DNS, analytics and logs exposed as remote MCP tools.",
    auth: "OAuth 2.1",
    endpoint: "https://observability.mcp.cloudflare.com/mcp",
    tags: ["edge", "infra"],
  },
];

export const categories = [
  {
    id: "api" as const,
    label: "APIs",
    line: "The contract layer",
    blurb:
      "Stable, versioned, documented. What an agent can actually rely on when it has to be right.",
  },
  {
    id: "mcp" as const,
    label: "MCPs",
    line: "The discovery layer",
    blurb:
      "Typed tools an agent finds and calls without bespoke glue. Where the standard is being set right now.",
  },
  {
    id: "cli" as const,
    label: "CLIs",
    line: "The execution layer",
    blurb:
      "Text in, text out. The oldest agent interface, and still the most composable one.",
  },
];
