# agentnexus-client

[![M8ven Score](https://m8ven.ai/badge/mcp/strategiumfinancepartner-agentnexus-1icap4?v=750581821817d53ee1cf0b7ec1f0ad59)](https://m8ven.ai/mcp/strategiumfinancepartner-agentnexus-1icap4)
[![Listed on mcpservers.org](https://mcpservers.org/badge.svg)](https://mcpservers.org/servers/strategiumfinancepartner/agentnexus)
[![Agent Nexus MCP server on Glama](https://glama.ai/mcp/servers/Strategiumfinancepartner/AgentNexus/badges/score.svg)](https://glama.ai/mcp/servers/Strategiumfinancepartner/AgentNexus)
[![Verified on Appside](https://appside.build/mcp-servers/agent-nexus/badge.svg)](https://appside.build/mcp-servers/agent-nexus/)

Official Python client for [Agent Nexus](https://agentnexus.app), a continuously probed registry of the APIs, MCP servers and CLIs that AI agents call.

Describe a need, get a callable interface plus live evidence that it works right now. Zero dependencies, no account.

```bash
pip install agentnexus-client
```

```python
from agentnexus_client import AgentNexus

best = AgentNexus().find("send a transactional email")
print(best["name"], best["call"]["endpoint"], best["trust"]["reliability_score"])
```

## What you get

| Method | What it does |
| --- | --- |
| `discover(need, limit=5)` | Ranked matches with endpoint, auth, formats, rate limit, pricing, trust |
| `find(need)` | Best single match or `None` |
| `search(query, category)` | Keyword search |
| `get_entry(slug)` | Full record |
| `health_card(slug)` | Last probe, transport, auth shape, schema hash, publisher proof, last failure, retry cost, expiry |
| `report(slug, ok, ...)` | Report a real call outcome |
| `AgentNexus.create_key()` | Mint a free key (1,000 calls/day) |

Anonymous use works out of the box. Set `AGENT_NEXUS_API_KEY` to use a key.

## Command line

```bash
agentnexus "geocode an address"
agentnexus card smtp2go-api
agentnexus key
```

## MCP

Prefer MCP? Point Claude, Cursor or Codex at `https://agentnexus.app/api/public/mcp` (Streamable HTTP, no auth).

MIT licensed.
