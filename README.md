# Agent Nexus

**The continuously verified registry of the APIs, MCP servers and CLIs that AI agents call.**

Live: **https://agentnexus.app** · MCP endpoint (no login): `https://agentnexus.app/api/public/mcp`

[![M8ven Score](https://m8ven.ai/badge/mcp/strategiumfinancepartner-agentnexus-1icap4?v=750581821817d53ee1cf0b7ec1f0ad59)](https://m8ven.ai/mcp/strategiumfinancepartner-agentnexus-1icap4)
[![Listed on mcpservers.org](https://mcpservers.org/badge.svg)](https://mcpservers.org/servers/strategiumfinancepartner/agentnexus)

[![Agent Nexus MCP server on Glama](https://glama.ai/mcp/servers/Strategiumfinancepartner/AgentNexus/badges/score.svg)](https://glama.ai/mcp/servers/Strategiumfinancepartner/AgentNexus)
[![Verified on Appside](https://appside.build/mcp-servers/agent-nexus/badge.svg)](https://appside.build/mcp-servers/agent-nexus/)

Agent Nexus answers one question for an autonomous agent: *"what can actually do this, right
now, and how exactly do I call it?"* Every entry is probed over HTTP on a schedule, so the
answer carries a real reliability score instead of a stale README badge.

Listed on the [official MCP registry](https://registry.modelcontextprotocol.io) as
`app.agentnexus/agent-nexus`, on [Smithery](https://smithery.ai/server/ceo-2z03/agent-nexus),
on [Glama](https://glama.ai/mcp/servers?query=author%3Aagent-nexus), on
[Appside](https://appside.build/mcp-servers/agent-nexus/) (owner-verified, live handshake check)
and on the [M8ven Trust Index](https://m8ven.ai/mcp/strategiumfinancepartner-agentnexus-1icap4).

---

## Connect an agent in one line

**Start with a completed task, not just a search:** obtain Berlin's weather through a discovered public API. The example below needs Python 3 only—no account, key, extra packages, or payment. Agent Nexus finds the service; the example calls the provider directly.

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

### Complete your first task

From a checkout of this repository:

```sh
python3 examples/first_weather_task.py
```

The example discovers Bright Sky, checks the returned no-key contract and expected HTTPS host, then requests Berlin's current weather using the provider's documented `/current_weather` endpoint. It prints the temperature, conditions and observation timestamp only after receiving a complete provider response. If discovery, the contract or the provider response changes, it stops without claiming success. It never books, pays, creates a key, or submits an invocation report.

Live check on October 30, 2026: discovery and the direct provider request both returned HTTP 200; the observation at 08:00 UTC was 7.5 °C and fog. This is an example result, not a promise of future availability or identical weather. This verification is our own test—not evidence of customer activation.

For a different task, read the returned service's authentication and pricing requirements before calling it. Report an outcome only after an actual invocation; discovery and health probes alone do not prove task completion.

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

## Case studies

- **[Remote Jobs API (Nova)](docs/case-studies/nova-remote-jobs-api.md)** — 14-day freshness pilot: 1.01M → 1.46M live listings, 32 → 82 sources, all 82 reporting `source_last_updated`, 100% probe reliability. Approved by Nova. [Web version](https://agentnexus.app/case-studies/nova)

**Live demos & articles** — [5 live demos](https://agentnexus.app/demos) (geolocation, payments, web search, 3-way comparison, fallback when a service is down) computed from the registry at page load. Articles: [How AI agents discover tools](docs/articles/how-ai-agents-discover-tools.md) · [MCP reliability](docs/articles/mcp-reliability-availability.md) · [Discovery & trust layer](docs/articles/discovery-and-trust-layer.md).

## Tiers

| Tier | Who it is for | Daily calls |
| --- | --- | --- |
| Anonymous | Trying it out, no account | 100 |
| Free key | Agent developers | 1 000 |
| Agent Pro | Production agents that must not stall | 50 000 |
| Publisher | API / MCP / CLI vendors: verified badge, listing report, confirmed-outage, structure-change and per-source stale-data alerts (email + signed webhook) | — |

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


## Publisher alerts

Publisher-plan entries get alerts on what actually breaks agents, not just "it answers":

- **Confirmed outage**: sent only after 2 consecutive failed checks, plus a recovery notice. Checks are hourly, so outages shorter than an hour can be missed.
- **Structure change**: the response no longer matches its documented contract.
- **Stale data per source**: e.g. "12 of 83 sources not updated for 24h+", with your own age and volume thresholds. One alert per change, no repeats.
- **Per-source volume**: an alert when any single source drops to zero live records (even if the overall total looks healthy), when it loses more than a chosen share since the previous hourly check (80% by default), and when it comes back.
- **Delivery**: email and webhook signed with `x-agentnexus-signature: sha256=<HMAC-SHA256 of raw body>`; failed sends are retried up to 5 times; test button and 30-alert history on your entry page.

Live evidence for any entry: `GET https://agentnexus.app/api/public/health-card/<slug>` (includes `data_quality` and `outage`).
