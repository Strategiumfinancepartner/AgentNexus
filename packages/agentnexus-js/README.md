# agentnexus-client

Official JavaScript/TypeScript client for [Agent Nexus](https://agentnexus.app), a continuously probed registry of the APIs, MCP servers and CLIs that AI agents call.

Describe a need, get a callable interface plus live evidence that it works right now. Zero dependencies, no account. Node 18+, Bun, Deno, browsers, edge.

```bash
npm install agentnexus-client
```

```js
import { AgentNexus } from "agentnexus-client";

const best = await new AgentNexus().find("send a transactional email");
console.log(best.name, best.call.endpoint, best.trust.reliability_score);
```

## API

| Method | What it does |
| --- | --- |
| `discover(need, { limit })` | Ranked matches with endpoint, auth, formats, rate limit, pricing, trust |
| `find(need)` | Best single match or `null` |
| `search(query, { category })` | Keyword search |
| `getEntry(slug)` | Full record |
| `healthCard(slug)` | Last probe, transport, auth shape, schema hash, publisher proof, last failure, retry cost, expiry |
| `report(slug, { ok })` | Report a real call outcome |
| `AgentNexus.createKey()` | Mint a free key (1,000 calls/day) |

Anonymous use works out of the box. Set `AGENT_NEXUS_API_KEY` or pass `{ apiKey }`.

## CLI

```bash
npx agentnexus-client "geocode an address"
npx agentnexus-client card smtp2go-api
npx agentnexus-client key
```

## MCP

Prefer MCP? Point Claude, Cursor or Codex at `https://agentnexus.app/api/public/mcp` (Streamable HTTP, no auth).

MIT licensed.
