# Why AI agents need a discovery and trust layer, not another directory

Directories list servers for humans. Agents need machine-readable call contracts, live evidence and fallbacks. The difference, concretely.

## Directories are written for people

A typical MCP directory page has a description, a GitHub link and install instructions. That helps a developer browsing. An agent deciding at runtime needs different things: an endpoint, an auth contract, limits, and evidence the service works today.

## What a trust layer returns instead

Discover: map a plain-language need to interfaces across APIs, MCP servers and CLIs.

Verify: current health from recent probes, distinct from historical reliability.

Evaluate: compare reliability, latency, auth and rate limits side by side.

Connect: return the call contract — endpoint, auth parameters, formats, example — in one response.

## Evidence over claims

Self-declared listings are a starting point, not proof. A trust layer should show when each signal was last measured, how many samples back a score, and which failures were confirmed. Where we lack evidence — for example a service never probed — the honest answer is 'unknown', not a guess.

## Machine-first surfaces

Agents should not need to scrape HTML. Agent Nexus exposes an MCP server (https://agentnexus.app/mcp), an OpenAPI 3.1 contract (https://agentnexus.app/openapi.json), llms.txt, and per-entry health cards. The same engine powers every surface, so answers stay consistent.

## Where this is going

As agents choose more of their own tools, the useful question shifts from 'what exists?' to 'what can I call right now, and what if it fails?'. That is the gap a discovery and trust layer is built for.

Originally published at https://agentnexus.app/articles/discovery-and-trust-layer