# n8n-nodes-agentnexus

n8n community node for [Agent Nexus](https://agentnexus.app): a registry of external APIs, MCP servers and CLIs, each one health-checked continuously. The registry answers a plain-language need ("send a transactional email") with the callable interfaces that match, each carrying live reliability signals.

- [Live registry status](https://agentnexus.app/status)
- [Public API docs](https://agentnexus.app/openapi.json)

## Operations

- **Discover**: describe a need in plain language and get matching callable interfaces with reliability signals attached.
- **Get Entry**: full details of one registry entry by slug.
- **Get Status**: public uptime and health-check totals.

All three are usable as tools inside n8n AI Agents (`usableAsTool`), so an agent can pick an external tool itself, call it, and read the result.

## Credentials

Optional. The node uses the `AgentNexusApi` credential:

| Field | Value |
| --- | --- |
| API Key | A free Agent Nexus key, e.g. `nx_live_...`. Leave empty for anonymous access. |

- Without a key: 100 calls/day per address.
- With a free key: 1,000 calls/day. Get one without an account: `curl -X POST https://agentnexus.app/api/public/keys` or visit [agentnexus.app/free-key](https://agentnexus.app/free-key).

The key is sent as an `x-api-key` header on every request.

## Worked example: Discover

**Step 1. Add the node** and pick the **Discover** operation.

**Step 2. Type the need in plain language** in the *Need* field:

```
send a transactional email
```

Optional parameters:

- *Category*: `API`, `MCP Server` or `CLI` to restrict the layer. Leave as `Any`.
- *Minimum Reliability*: `0-100`. For example `60` keeps only interfaces scoring 60 or above.
- *Limit*: maximum results to return (1-50).

**Step 3. Run it.** The node sends `GET https://agentnexus.app/api/public/discover?need=send%20a%20transactional%20email&limit=5` and returns JSON like this (trimmed to one match):

```json
{
  "need": "send a transactional email",
  "coverage": "exact",
  "count": 1,
  "uncovered": false,
  "note": "Matched on declared capabilities. Call the interface with the `call` contract, then report the outcome.",
  "matches": [
    {
      "slug": "smtp2go-api",
      "name": "SMTP2GO",
      "category": "api",
      "summary": "Transactional email over a JSON endpoint or plain SMTP relay.",
      "match_score": 31.95,
      "matched_on": "capability",
      "capabilities": ["send email", "transactional email", "smtp relay"],
      "call": {
        "endpoint": "https://api.smtp2go.com/v3/email/send",
        "auth_mode": "API key header",
        "input_format": "application/json",
        "output_format": "application/json",
        "rate_limit": null,
        "pricing": "1k emails/month free",
        "example": null,
        "docs_url": "https://apidoc.smtp2go.com/documentation/"
      },
      "trust": {
        "verified": false,
        "reliability_score": 78,
        "uptime": 1,
        "samples": 9,
        "agent_reports": 0,
        "avg_latency_ms": 1185,
        "last_probe_ok": true,
        "last_probe_at": "2026-10-01T04:17:14.349+00:00"
      },
      "report": {
        "endpoint": "https://agentnexus.app/api/public/report",
        "method": "POST"
      }
    }
  ],
  "next_steps": ["..."]
}
```

**Step 4. Use the result downstream.** Typical pattern:

1. A downstream **HTTP Request** node reads `matches[0].call.endpoint` as the URL and `matches[0].call.input_format` as the content type.
2. Authentication: the provider's own credential (the node returns `call.auth_mode` so you know what to configure). The Agent Nexus key is only for the registry, never for the provider's API.
3. Optionally a final HTTP Request reports the outcome to `POST /api/public/report` with `{"slug":"smtp2go-api","outcome":"success","latency_ms":412}`. Reported outcomes feed the reliability scores other agents see, and raise your daily quota by up to +250/day.

In an **AI Agent** workflow, expose the node as a tool and ask the agent in plain language ("find a tool to send an email"): it calls Discover, reads `trust.reliability_score` before choosing, and can fall back to the next match when a call fails.

## What each response field means

Top level:

| Field | Meaning |
| --- | --- |
| `need` | The normalized need as understood by the registry. |
| `coverage` | `exact` when declared capabilities match the need, `partial` when only some tokens matched, `none` when nothing matched. |
| `count` | Number of matches returned. |
| `uncovered` | `true` when the need is a coverage gap: `matches` then lists the most reliable interfaces in that layer as starting points only, never as a match. |
| `note` | One-line explanation of how the result was built. |
| `next_steps` | Suggested follow-up calls (e.g. `get_entry` for the top match). |

Each item in `matches`:

| Field | Meaning |
| --- | --- |
| `slug` | Stable registry ID. Use it for Get Entry and for outcome reports. |
| `name`, `category`, `summary` | Display name, interface layer (`api`, `mcp` or `cli`) and one-line description. |
| `match_score` | Ranking score (higher is better) computed from capability, reliability and popularity signals. |
| `matched_on` | `capability` when the match comes from declared capabilities, `fallback` when it is a starting-point suggestion. |
| `capabilities` | The declared capabilities that drove the match. |
| `call.endpoint` | The real URL to call. |
| `call.auth_mode` | How the provider authenticates (e.g. `API key header`, `Bearer token`, `none`). |
| `call.auth_params` | Parameter names the provider expects for authentication, when declared. |
| `call.input_format` / `call.output_format` | Expected request and response formats (`application/json`, `text/plain`, ...). |
| `call.rate_limit` | Provider-side rate limit as declared by the publisher. |
| `call.pricing` | Pricing summary as declared by the publisher. |
| `call.example` | Ready-to-run invocation example, when the publisher supplied one. |
| `call.docs_url` | Provider documentation link. |
| `trust.verified` | Publisher identity verified by Agent Nexus. |
| `trust.reliability_score` | 0-100 score from Agent Nexus health probes and agent outcome reports. |
| `trust.uptime` | Share of probes answered OK (0-1) over the tracked window. |
| `trust.samples` | Number of probes behind the score. |
| `trust.agent_reports` | Number of real outcome reports from calling agents. |
| `trust.avg_latency_ms` | Average round-trip latency in milliseconds. |
| `trust.last_probe_ok` / `trust.last_probe_at` | Result and time of the most recent health probe (ISO 8601, UTC). |
| `report` | Ready-made outcome-report payload for closing the loop after a real call. |

Reliability signals come from Agent Nexus health probes (liveness, capability and response-schema checks, run continuously and published at [agentnexus.app/status](https://agentnexus.app/status)) plus outcome reports from calling agents. They describe the interface, not your workflow.

## Other operations

- **Get Entry** takes a `slug` (e.g. `smtp2go-api`) and returns the complete registry record: endpoint, authentication parameters, formats, rate limits, pricing, docs link and health history. Use it once a candidate is chosen, to build the actual request.
- **Get Status** returns the registry's public totals: entries monitored, checks run, success rate, average latency. Use it to display registry health inside your workflow.

## Install

Settings > Community Nodes > Install > `n8n-nodes-agentnexus`

## License

MIT
