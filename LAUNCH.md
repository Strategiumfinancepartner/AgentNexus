# Agent Nexus — launch runbook

Everything technical is ready. This file is the operator checklist for launch
day. Replace `{ORIGIN}` with the production URL after publishing.

---

## 0. Publish (manual)

Publish the app, then verify each surface answers:

```bash
curl -s {ORIGIN}/llms.txt | head -20
curl -s "{ORIGIN}/api/public/discover?need=send+a+transactional+email" | head -40
curl -s {ORIGIN}/server.json
curl -s {ORIGIN}/.well-known/mcp.json
curl -s {ORIGIN}/sitemap.xml | head -5
curl -s -X POST {ORIGIN}/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Then connect it once yourself from Claude Code to confirm the OAuth consent
screen renders and approval returns to the client:

```bash
claude mcp add --transport http agent-nexus {ORIGIN}/mcp
```

---

## 1. Directory submissions (the actual distribution work)

Agents don't find a server through Google — they find it because a client or a
directory already knows about it. Submit in this order; the first three carry
most of the traffic.

| # | Where | How | Payload |
|---|-------|-----|---------|
| 1 | **Official MCP Registry** (`modelcontextprotocol/registry`) | `mcp-publisher` CLI or the registry API | `{ORIGIN}/server.json` (already served in the required schema) |
| 2 | **Smithery** (smithery.ai) | "Add server" → remote server → paste URL | `{ORIGIN}/mcp` |
| 3 | **Glama** (glama.ai/mcp/servers) | Submit form, remote HTTP server | `{ORIGIN}/mcp` + `{ORIGIN}/connect` |
| 4 | **mcp.so** | Submit form | `{ORIGIN}/mcp` |
| 5 | **PulseMCP** (pulsemcp.com) | Submit form | `{ORIGIN}/mcp` |
| 6 | **awesome-mcp-servers** (punkpeye, appcypher) | PR adding one line under *Remote / Hosted* | see PR line below |
| 7 | **Cursor Directory** (cursor.directory/mcp) | Submit form | `{ORIGIN}/mcp` |
| 8 | **Lovable connectors** | `Add to Lovable` from the agent-integrations panel | automatic |

**PR line for awesome lists:**

```md
- [Agent Nexus]({ORIGIN}) 🌐 — Continuously verified registry of the APIs, MCP servers and CLIs agents call. Maps a need to a callable interface with auth contract, formats and live reliability score.
```

**Canonical description** (reuse verbatim everywhere, 1 sentence):

> Agent Nexus is a continuously verified registry of the APIs, MCP servers and
> CLIs that AI agents call — it maps a natural-language need to a callable
> interface, with its auth contract, input/output formats, rate limits and a
> live reliability score.

---

## 2. Launch post (Hacker News / X / LinkedIn)

**Title:** Show HN: Agent Nexus — a continuously verified registry of APIs, MCPs and CLIs for agents

**Body:**

> Lists of APIs and MCP servers already exist. What doesn't exist is a registry
> an agent can *call*: one where every entry is probed continuously (MCP servers
> are asked for their tool list, APIs must answer a machine contract), where a
> need in plain language returns a callable interface with its auth parameters
> and reliability score, and where the agent itself can submit an interface,
> vote and report a failed invocation.
>
> That last part matters: if agents are the users, they have to be able to
> write, not only read. Every real invocation reported back moves the
> reliability score, and every unmatched need is logged as a coverage gap.
>
> No account needed to read:
>
>     curl "{ORIGIN}/api/public/discover?need=send+a+transactional+email"
>
> Or add it to Claude / Cursor / VS Code in one line: {ORIGIN}/connect
>
> Currently indexing {N} interfaces across APIs, MCP servers and CLIs.

**Short X version:**

> The next billion internet users won't be human.
> Agent Nexus: a registry of the APIs, MCP servers and CLIs agents call —
> continuously probed, callable over MCP, and writable *by agents themselves*.
> One curl, no account:
> curl "{ORIGIN}/api/public/discover?need=send+an+email"

---

## 3. Post-launch monitoring (first 72h)

- `/signals` (moderator only): watch **uncovered needs** — every need with
  `coverage: none` is a catalog gap. Fill the top 10 by hand within 48h; this
  is what turns a one-time visit into a returning caller.
- Watch **invocation reports**: any entry with repeated failures should be
  re-probed or unverified.
- Watch the cron `agent-nexus-health-check` (every 6h) — confirm
  `checks_total` keeps rising.
- Re-run the ingest after editing `src/lib/ingest/catalog.ts`:

```bash
curl -X POST {ORIGIN}/api/public/ingest -H "x-cron-token: <token>"
```
