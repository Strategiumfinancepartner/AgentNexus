/** Public demo definitions. Browser-safe: no server imports. */
export type Demo = {
  slug: string;
  title: string;
  description: string;
  problem: string;
  need: string;
  category?: "api" | "mcp" | "cli";
  limit: number;
  mode: "find" | "compare" | "alternative";
  explain: string;
};

export const DEMOS: Demo[] = [
  {
    slug: "find-geolocation-api",
    title: "Find and verify a geolocation API",
    description: "An agent needs to turn an IP address or coordinates into a location. Agent Nexus returns callable geolocation APIs with today's probe status.",
    problem: "Your agent must geolocate an IP or reverse-geocode coordinates, but it does not know which API is reachable today, which needs a key, and what the rate limits are.",
    need: "geolocate an ip address",
    category: "api",
    limit: 5,
    mode: "find",
    explain: "Each match carries the endpoint, auth mode and rate limit, plus current_health from the latest probe so the agent can skip a service that is down right now.",
  },
  {
    slug: "find-payment-api",
    title: "Find a suitable payment API",
    description: "An agent needs to accept or create a payment. Agent Nexus ranks payment APIs and shows auth and pricing before any call.",
    problem: "Payment APIs differ in auth (OAuth vs secret key), pricing and sandbox availability. An agent must pick one it can actually authenticate with.",
    need: "accept a card payment",
    category: "api",
    limit: 5,
    mode: "find",
    explain: "Auth mode and pricing are returned per match, so the agent can reject providers it has no credentials for before making a single third-party call.",
  },
  {
    slug: "discover-web-search-api",
    title: "Discover a web search API or MCP server",
    description: "An agent needs to search the web. Agent Nexus returns web search APIs and MCP servers across layers, with probe evidence.",
    problem: "Web search is offered as HTTP APIs and as MCP servers. The agent needs one it can call now, in the layer it supports.",
    need: "search the web",
    limit: 6,
    mode: "find",
    explain: "Results span APIs and MCP servers. Filter with category=mcp if the agent can only speak MCP.",
  },
  {
    slug: "compare-three-apis",
    title: "Compare three APIs by reliability and capabilities",
    description: "Side-by-side comparison of three transactional email APIs: current health, historical reliability, latency, auth and limits.",
    problem: "Choosing between providers on marketing pages is guesswork. Agents need measured reliability and declared capabilities side by side.",
    need: "send a transactional email",
    category: "api",
    limit: 3,
    mode: "compare",
    explain: "Current health (latest probe) and historical reliability (score over all samples) are shown separately: a service can be up now with a weak history, or the reverse.",
  },
  {
    slug: "find-alternative-when-down",
    title: "Find an alternative when a service becomes unavailable",
    description: "When a provider fails, Agent Nexus suggests services with the same capabilities that are currently up — advisory, never auto-called.",
    problem: "Your agent's email provider starts failing. It needs a replacement with the same capability and a compatible auth style, now.",
    need: "sendgrid is down",
    category: "api",
    limit: 4,
    mode: "alternative",
    explain: "Phrasing like 'X is down' or 'alternative to X' excludes the failing service and searches by its capabilities. Any match that is itself down or degraded also carries an alternatives[] list. Suggestions are not guaranteed and Agent Nexus never calls them for you.",
  },
];

export function demoBySlug(slug: string) {
  return DEMOS.find((d) => d.slug === slug);
}

export function demoCurl(d: Demo) {
  const q = new URLSearchParams({ need: d.need, limit: String(d.limit), ...(d.category ? { category: d.category } : {}) });
  return `curl -s "https://agentnexus.app/api/public/discover?${q.toString()}"`;
}

export function demoPython(d: Demo) {
  return `import requests

r = requests.get(
    "https://agentnexus.app/api/public/discover",
    params={"need": ${JSON.stringify(d.need)}, "limit": ${d.limit}${d.category ? `, "category": "${d.category}"` : ""}},
    headers={"x-api-key": "YOUR_FREE_KEY"},  # optional: 1,000 calls/day instead of 100
    timeout=15,
)
for m in r.json()["matches"]:
    print(m["slug"], m["current_health"]["status"], m["trust"]["reliability_score"], m["call"]["endpoint"])`;
}

export function demoMcp(d: Demo) {
  return `{
  "method": "tools/call",
  "params": {
    "name": "discover_capabilities",
    "arguments": { "need": ${JSON.stringify(d.need)}, "limit": ${d.limit}${d.category ? `, "category": "${d.category}"` : ""} }
  }
}`;
}
