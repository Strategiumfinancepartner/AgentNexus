# Agent Nexus

**The continuously verified registry of the APIs, MCP servers and CLIs that AI agents call.**

Live: **https://agentnexus.app** · MCP endpoint (no login): `https://agentnexus.app/api/public/mcp`

Agent Nexus answers one question for an autonomous agent: *"what can actually do this, right
now, and how exactly do I call it?"* Every entry is probed over HTTP on a schedule, so the
answer carries a real reliability score instead of a stale README badge.

Listed on the [official MCP registry](https://registry.modelcontextprotocol.io) as
`app.agentnexus/agent-nexus`, on [Smithery](https://smithery.ai/server/ceo-2z03/agent-nexus)
and on [Glama](https://glama.ai/mcp/servers?query=author%3Aagent-nexus).

---

## Connect an agent in one line

MCP (Streamable HTTP, stateless, anonymous — no consent screen, no key):

```json
{
  "mcpServers": {
    "agent-nexus": {
      "type": "http",
      "url": "https://agentnexus.app/api/public/mcp"
    }
  }
}
```

Or over plain HTTP — an agent can register itself and start calling without any human:

```sh
# 1. get your own key (instant, free tier: 1000 calls/day)
curl -s -X POST https://agentnexus.app/api/public/keys \
  -H 'content-type: application/json' \
  -d '{"agent":"my-agent","purpose":"capability discovery"}'

# 2. turn a plain-language need into a callable contract
curl -s 'https://agentnexus.app/api/public/discover?need=send%20transactional%20email' \
  -H 'x-api-key: nx_...'
```

## MCP tools

| Tool | What it does |
| --- | --- |
| `discover_capabilities` | Plain-language need → ranked callable interfaces with auth, formats, limits, reliability |
| `search_registry` | Keyword search across APIs, MCP servers and CLIs |
| `get_entry` | Full contract for one interface |
| `list_categories` | Browse the taxonomy |

## Machine-readable surfaces

| Surface | Purpose |
| --- | --- |
| `/llms.txt`, `/agents.txt` | How an agent onboards itself, unattended |
| `/api/public/registry` | Full typed registry |
| `/api/public/capabilities` | Capability index |
| `/api/public/entries.ndjson` | Streamable bulk export |
| `/api/public/status` | Uptime history and recent incidents |
| `/openapi.json`, `/server.json` | OpenAPI + MCP server manifest |
| `/.well-known/mcp.json`, `/.well-known/agent-card.json` | Discovery manifests |
| `/feed.xml` | New and updated interfaces |

## Human pages

[`/explore`](https://agentnexus.app/explore) · [`/connect`](https://agentnexus.app/connect) ·
[`/status`](https://agentnexus.app/status) · [`/pricing`](https://agentnexus.app/pricing) ·
[`/keys`](https://agentnexus.app/keys)

## Tiers

| Tier | Who it is for | Daily calls |
| --- | --- | --- |
| Anonymous | Trying it out, no account | 100 |
| Free key | Agent developers | 1 000 |
| Agent Pro | Production agents that must not stall | 50 000 |
| Publisher | API / MCP / CLI vendors: verified badge, monitoring, alerts | — |

## Stack

TanStack Start (React 19, Vite), Tailwind CSS v4, Postgres with row-level security,
server functions on an edge runtime, scheduled HTTP health probes. Built with
[Lovable](https://lovable.dev).

Only publishable keys live in this repository; every secret is held server-side.

## Development

```sh
git clone https://github.com/Strategiumfinancepartner/AgentNexus.git
cd AgentNexus
npm i
npm run dev
```

---

Operated by BrainPath.io · support@agentnexus.app
