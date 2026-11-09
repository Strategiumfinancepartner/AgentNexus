# MCP reliability: why availability is more than an HTTP 200

Liveness, capability, schema and data freshness are four different failure modes. How to probe MCP servers and APIs so agents are not misled.

## A 200 means the server is breathing

An uptime ping tells you the process answers. It does not tell you the MCP handshake works, that tools/list still returns the tools your agent depends on, or that the data behind them is current.

## Four layers worth checking

Liveness: does the endpoint answer within a timeout? Use independent timeouts per attempt, and confirm outages with a direct GET — a timed-out HEAD alone should never mark a working MCP endpoint offline.

Capability: does the protocol work? For MCP, initialize and tools/list must succeed and return the declared tools.

Schema: does the response still have the shape agents expect? A 200 that misses a required field is the failure agents hit hardest, because nothing errors until parsing.

Data: is the content fresh and complete? A source can keep answering 200 while its volume drops to zero or its timestamps stop advancing.

## Confirm before you alert

One failed probe is often a network blip. Agent Nexus only declares an outage after two consecutive failed probes, and records recovery separately. That keeps alerts actionable for publishers and avoids agents abandoning a working service.

## Give agents a fallback, not just a red light

When a service is down or degraded, a discovery layer can do more than flag it: it can suggest services with overlapping capabilities that are currently up, preferring the same auth style. These are suggestions from probe data, not guarantees, and should never be called automatically on the user's behalf.

```bash
curl -s "https://agentnexus.app/api/public/discover?need=sendgrid%20is%20down"
```

Originally published at https://agentnexus.app/articles/mcp-reliability-availability