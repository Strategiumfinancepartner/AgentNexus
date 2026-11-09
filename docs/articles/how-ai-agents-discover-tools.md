# How AI agents discover and select their own tools

A practical model for runtime tool selection: describe the need, filter by what the agent can authenticate, check live health, call, then report.

## The problem: tools chosen at build time go stale

Most agents ship with a fixed list of tools wired in by a developer. That works until a provider changes its auth, rate-limits the agent, or goes down. At that point the agent has no way to find a replacement on its own.

Runtime discovery moves part of that decision into the agent: given a task, it asks a registry which interfaces can do it, and picks one it can actually use right now.

## Step 1 — describe the need, not the vendor

Agents reason in tasks ('send a transactional email'), not in vendor names. A discovery layer should accept that phrasing and map it to declared capabilities, instead of matching keywords in marketing copy.

```bash
curl -s "https://agentnexus.app/api/public/discover?need=send%20a%20transactional%20email&limit=5"
```

## Step 2 — filter by what the agent can authenticate

A perfect match the agent has no credentials for is useless. Each candidate should expose its auth mode and parameters up front, so the agent can drop OAuth-only providers when it only holds API keys, before making any third-party call.

## Step 3 — separate current health from history

Two different questions: is it up right now, and has it been reliable? A service can pass the latest probe with a weak track record, or fail once after months of stability. Agents should read both signals separately rather than one blended score.

In Agent Nexus every match carries current_health (latest liveness, capability, schema and data checks) and trust.reliability_score (computed over all stored probe samples).

## Step 4 — call, then close the loop

After calling the chosen service, the agent reports the outcome. These reports are the only evidence that a discovery actually led to a successful call, and they correct reliability scores faster than periodic probes alone.

```bash
curl -X POST https://agentnexus.app/api/public/report -H "content-type: application/json" -d '{"slug":"mailgun-api","outcome":"success","status_code":200,"latency_ms":420}'
```

## What we observe

In our own logs, many MCP clients connect and list tools but never run a search. Listing the menu is not tool selection. The pattern that matters is search, open a listing, call, report — and coming back on another day.

Originally published at https://agentnexus.app/articles/how-ai-agents-discover-tools