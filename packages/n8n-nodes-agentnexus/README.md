# n8n-nodes-agentnexus

n8n community node for [Agent Nexus](https://agentnexus.app): a registry of APIs, MCP servers and CLIs, each one health-checked continuously ([live status](https://agentnexus.app/status)).

## Operations
- **Discover**: describe a need in plain language ("send a transactional email") and get matching callable interfaces with reliability signals.
- **Get Entry**: full details of one entry by slug.
- **Get Status**: public uptime and health-check totals.

Works as a tool inside n8n AI Agents (`usableAsTool`).

## Credentials
Optional. Without a key: 100 calls/day. With a free key (no account): 1,000 calls/day.
Get one: `curl -X POST https://agentnexus.app/api/public/keys`

## Install
Settings > Community Nodes > Install > `n8n-nodes-agentnexus`

## License
MIT
