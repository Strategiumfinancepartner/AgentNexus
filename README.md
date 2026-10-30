# Agent Nexus

**The continuously verified registry of the APIs, MCP servers and CLIs that AI agents call.**

Live: **https://agentnexus.app** · MCP endpoint (no login): `https://agentnexus.app/api/public/mcp`

[![M8ven Score](https://m8ven.ai/badge/mcp/strategiumfinancepartner-agentnexus-1icap4?v=750581821817d53ee1cf0b7ec1f0ad59)](https://m8ven.ai/mcp/strategiumfinancepartner-agentnexus-1icap4)
[![Listed on mcpservers.org](https://mcpservers.org/badge.svg)](https://mcpservers.org/servers/strategiumfinancepartner/agentnexus)

[![Agent Nexus MCP server on Glama](https://glama.ai/mcp/servers/Strategiumfinancepartner/AgentNexus/badges/score.svg)](https://glama.ai/mcp/servers/Strategiumfinancepartner/AgentNexus)

Agent Nexus answers one question for an autonomous agent: *"what can actually do this, right
now, and how exactly do I call it?"* Every entry is probed over HTTP on a schedule, so the
answer carries a real reliability score instead of a stale README badge.

Listed on the [official MCP registry](https://registry.modelcontextprotocol.io) as
`app.agentnexus/agent-nexus`, on [Smithery](https://smithery.ai/server/ceo-2z03/agent-nexus),
on [Glama](https://glama.ai/mcp/servers?query=author%3Aagent-nexus) and on the
[M8ven Trust Index](https://m8ven.ai/mcp/strategiumfinancepartner-agentnexus-1icap4).

---

## Connect an agent in one line

**Try a real discovery task:** [find transactional email APIs](https://agentnexus.app/api/public/discover?q=send%20transactional%20email&limit=3), [browse the registry](https://agentnexus.app/explore), or follow the [first-task guide](https://agentnexus.app/connect). Discovery returns a service's call contract; Agent Nexus does not call that service on your behalf.

### Official integrations

| Client | Installation / guide |
| --- | --- |
| Python | [`pip install agentnexus-client`](https://pypi.org/project/agentnexus-client/) · [examples](packages/agentnexus-client-py/README.md) |
| JavaScript / TypeScript | [`npm install agentnexus-client`](https://www.npmjs.com/package/agentnexus-client) · [examples](packages/agentnexus-js/README.md) |
| n8n | [`n8n-nodes-agentnexus`](https://www.npmjs.com/package/n8n-nodes-agentnexus) |
| LangChain | [`langchain-agent-nexus`](https://pypi.org/project/langchain-agent-nexus/) |
| CrewAI | [`crewai-agent-nexus`](https://pypi.org/project/crewai-agent-nexus/) |
| LlamaIndex | [`llama-index-tools-agent-nexus`](https://pypi.org/project/llama-index-tools-agent-nexus/) |
| Gemini CLI | [Extension manifest](gemini-extension.json) · install with `gemini extensions install https://github.com/Strategiumfinancepartner/AgentNexus` |

Use only the package names linked above; unrelated projects also use the AgentNexus name. A [free key](https://agentnexus.app/free-key) gives 1,000 calls/day shared across compatible clients; keep it private. Anonymous discovery remains available at 100 calls/day per source address.

### Make the first useful call

```sh
curl -s https://agentnexus.app/api/public/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"discover_capabilities","arguments":{"need":"send transactional email","limit":3}}}'
```

Select a returned service, read its authentication and pricing requirements, and call its endpoint with that provider's credentials. Report an outcome only after an actual invocation; a successful discovery is not proof that the downstream task succeeded.

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
| `list_entries` | Page through the approved catalogue |
| `report_invocation` | Report the outcome of an actual downstream call (key required) |
| `submit_entry` | Submit an API, MCP server or CLI for human review (member or agent key) |
| `list_my_submissions` | Review your own submissions (authentication required) |

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

Agent Nexus · support@agentnexus.app
