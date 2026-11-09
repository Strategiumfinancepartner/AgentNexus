/** Technical articles. Browser-safe; also exported as Markdown for GitHub/dev.to. */
export type Article = {
  slug: string;
  title: string;
  description: string;
  published: string;
  sections: { heading: string; body: string[]; code?: { language: string; code: string } }[];
};

export const ARTICLES: Article[] = [
  {
    slug: "how-ai-agents-discover-tools",
    title: "How AI agents discover and select their own tools",
    description: "A practical model for runtime tool selection: describe the need, filter by what the agent can authenticate, check live health, call, then report.",
    published: "2026-11-09",
    sections: [
      {
        heading: "The problem: tools chosen at build time go stale",
        body: [
          "Most agents ship with a fixed list of tools wired in by a developer. That works until a provider changes its auth, rate-limits the agent, or goes down. At that point the agent has no way to find a replacement on its own.",
          "Runtime discovery moves part of that decision into the agent: given a task, it asks a registry which interfaces can do it, and picks one it can actually use right now.",
        ],
      },
      {
        heading: "Step 1 — describe the need, not the vendor",
        body: [
          "Agents reason in tasks ('send a transactional email'), not in vendor names. A discovery layer should accept that phrasing and map it to declared capabilities, instead of matching keywords in marketing copy.",
        ],
        code: { language: "curl", code: 'curl -s "https://agentnexus.app/api/public/discover?need=send%20a%20transactional%20email&limit=5"' },
      },
      {
        heading: "Step 2 — filter by what the agent can authenticate",
        body: [
          "A perfect match the agent has no credentials for is useless. Each candidate should expose its auth mode and parameters up front, so the agent can drop OAuth-only providers when it only holds API keys, before making any third-party call.",
        ],
      },
      {
        heading: "Step 3 — separate current health from history",
        body: [
          "Two different questions: is it up right now, and has it been reliable? A service can pass the latest probe with a weak track record, or fail once after months of stability. Agents should read both signals separately rather than one blended score.",
          "In Agent Nexus every match carries current_health (latest liveness, capability, schema and data checks) and trust.reliability_score (computed over all stored probe samples).",
        ],
      },
      {
        heading: "Step 4 — call, then close the loop",
        body: [
          "After calling the chosen service, the agent reports the outcome. These reports are the only evidence that a discovery actually led to a successful call, and they correct reliability scores faster than periodic probes alone.",
        ],
        code: { language: "curl", code: `curl -X POST https://agentnexus.app/api/public/report -H "content-type: application/json" -d '{"slug":"mailgun-api","outcome":"success","status_code":200,"latency_ms":420}'` },
      },
      {
        heading: "What we observe",
        body: [
          "In our own logs, many MCP clients connect and list tools but never run a search. Listing the menu is not tool selection. The pattern that matters is search, open a listing, call, report — and coming back on another day.",
        ],
      },
    ],
  },
  {
    slug: "mcp-reliability-availability",
    title: "MCP reliability: why availability is more than an HTTP 200",
    description: "Liveness, capability, schema and data freshness are four different failure modes. How to probe MCP servers and APIs so agents are not misled.",
    published: "2026-11-09",
    sections: [
      {
        heading: "A 200 means the server is breathing",
        body: [
          "An uptime ping tells you the process answers. It does not tell you the MCP handshake works, that tools/list still returns the tools your agent depends on, or that the data behind them is current.",
        ],
      },
      {
        heading: "Four layers worth checking",
        body: [
          "Liveness: does the endpoint answer within a timeout? Use independent timeouts per attempt, and confirm outages with a direct GET — a timed-out HEAD alone should never mark a working MCP endpoint offline.",
          "Capability: does the protocol work? For MCP, initialize and tools/list must succeed and return the declared tools.",
          "Schema: does the response still have the shape agents expect? A 200 that misses a required field is the failure agents hit hardest, because nothing errors until parsing.",
          "Data: is the content fresh and complete? A source can keep answering 200 while its volume drops to zero or its timestamps stop advancing.",
        ],
      },
      {
        heading: "Confirm before you alert",
        body: [
          "One failed probe is often a network blip. Agent Nexus only declares an outage after two consecutive failed probes, and records recovery separately. That keeps alerts actionable for publishers and avoids agents abandoning a working service.",
        ],
      },
      {
        heading: "Give agents a fallback, not just a red light",
        body: [
          "When a service is down or degraded, a discovery layer can do more than flag it: it can suggest services with overlapping capabilities that are currently up, preferring the same auth style. These are suggestions from probe data, not guarantees, and should never be called automatically on the user's behalf.",
        ],
        code: { language: "curl", code: 'curl -s "https://agentnexus.app/api/public/discover?need=sendgrid%20is%20down"' },
      },
    ],
  },
  {
    slug: "discovery-and-trust-layer",
    title: "Why AI agents need a discovery and trust layer, not another directory",
    description: "Directories list servers for humans. Agents need machine-readable call contracts, live evidence and fallbacks. The difference, concretely.",
    published: "2026-11-09",
    sections: [
      {
        heading: "Directories are written for people",
        body: [
          "A typical MCP directory page has a description, a GitHub link and install instructions. That helps a developer browsing. An agent deciding at runtime needs different things: an endpoint, an auth contract, limits, and evidence the service works today.",
        ],
      },
      {
        heading: "What a trust layer returns instead",
        body: [
          "Discover: map a plain-language need to interfaces across APIs, MCP servers and CLIs.",
          "Verify: current health from recent probes, distinct from historical reliability.",
          "Evaluate: compare reliability, latency, auth and rate limits side by side.",
          "Connect: return the call contract — endpoint, auth parameters, formats, example — in one response.",
        ],
      },
      {
        heading: "Evidence over claims",
        body: [
          "Self-declared listings are a starting point, not proof. A trust layer should show when each signal was last measured, how many samples back a score, and which failures were confirmed. Where we lack evidence — for example a service never probed — the honest answer is 'unknown', not a guess.",
        ],
      },
      {
        heading: "Machine-first surfaces",
        body: [
          "Agents should not need to scrape HTML. Agent Nexus exposes an MCP server (https://agentnexus.app/mcp), an OpenAPI 3.1 contract (https://agentnexus.app/openapi.json), llms.txt, and per-entry health cards. The same engine powers every surface, so answers stay consistent.",
        ],
      },
      {
        heading: "Where this is going",
        body: [
          "As agents choose more of their own tools, the useful question shifts from 'what exists?' to 'what can I call right now, and what if it fails?'. That is the gap a discovery and trust layer is built for.",
        ],
      },
    ],
  },
];

export function articleBySlug(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}

export function articleMarkdown(a: Article) {
  const parts = [`# ${a.title}`, "", a.description, ""];
  for (const s of a.sections) {
    parts.push(`## ${s.heading}`, "", ...s.body.flatMap((p) => [p, ""]));
    if (s.code) parts.push("```" + (s.code.language === "curl" ? "bash" : s.code.language), s.code.code, "```", "");
  }
  parts.push(`Originally published at https://agentnexus.app/articles/${a.slug}`);
  return parts.join("\n");
}
