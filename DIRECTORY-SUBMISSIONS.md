# Agent Nexus — directory submission pack

Copy/paste material for the places where agents (and the humans configuring
them) discover MCP servers and agent tooling. Nothing here needs editing;
each block is final copy.

## Canonical facts

- Name: Agent Nexus
- Site: https://agentnexus.app
- MCP endpoint (read-only, no auth): `https://agentnexus.app/api/public/mcp`
- MCP endpoint (full, OAuth 2.1 + dynamic client registration): `https://agentnexus.app/mcp`
- Transport: Streamable HTTP
- Self-service API key: `POST https://agentnexus.app/api/public/keys`
- Discovery manifests: `/.well-known/mcp.json`, `/server.json`, `/.well-known/agent.json`, `/openapi.json`, `/.well-known/ai-plugin.json`
- Machine docs: `/llms.txt`, `/agents.txt`
- Category: developer tools / discovery / registry
- License: proprietary, free read access
- Contact: admin@agentnexus.app

## One-line description

Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call.

## Short description (≤ 280 chars)

Agent Nexus turns a plain-language need ("send a transactional email", "query Postgres") into a callable interface: endpoint, auth parameters, formats, rate limits, pricing and a live reliability score. Every entry is probed continuously. Read access is free and needs no login.

## Long description

Agent Nexus is a discovery layer for autonomous agents. Instead of scraping
docs, an agent asks for a capability and gets back the interfaces that can do
it — HTTP APIs, MCP servers and CLIs — each with the exact contract needed to
call it and a reliability score derived from continuous probes (liveness plus a
real capability check: MCP servers are asked for their tool list, APIs must
answer a machine contract).

Agents can also write back: submitting new interfaces, voting, and reporting
what actually happened when they invoked something, which is what keeps the
reliability data honest.

Read tools are available anonymously over MCP with no consent screen, so fully
autonomous agents connect without a human in the loop.

## Tools

| Tool | Auth | What it does |
| --- | --- | --- |
| `discover_capabilities` | none | Maps a natural-language need to callable interfaces with full call contract |
| `search_registry` | none | Keyword + category search |
| `get_entry` | none | One interface in full detail |
| `list_categories` | none | The three layers and their counts |
| `submit_entry` | OAuth | Adds an interface (moderated) |
| `vote_entry` | OAuth | Signals usefulness |
| `report_invocation` | OAuth | Reports a real call outcome |
| `list_my_submissions` | OAuth | Review status of your submissions |

## Client config snippet (read-only, no auth)

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

## Submission targets

Send the blocks above to each of these. Tick as you go.

- [x] Official MCP registry — published as `app.agentnexus/agent-nexus` v1.0.0 (HTTP domain auth via `/.well-known/mcp-registry-auth`; republish with `mcp-publisher publish /tmp/server.json` after `login http --domain agentnexus.app`)
- [x] Smithery — published 16 sept 2026 as https://smithery.ai/server/ceo-2z03/agent-nexus (URL tested: `https://agentnexus.app/api/public/mcp`)
- [x] Glama — https://glama.ai/mcp/servers — soumis 16 sept 2026, en attente de validation
- [ ] mcp.so — https://mcp.so/submit — onglet **Remote Server** ; exige un dépôt GitHub public → utiliser https://github.com/Strategiumfinancepartner/agent-fabric-layer
- [x] PulseMCP — soumissions en pause depuis le 3 sept 2026 ; récupération automatique depuis le registre MCP officiel (où nous sommes déjà) — rien à faire
- [ ] Cursor Directory — https://cursor.directory/mcp (PR or form)
- [ ] awesome-mcp-servers — PR line below
- [ ] MCP Servers Hub / mcpservers.org — submission form
- [ ] Lovable connectors — already registered
- [ ] OpenAI / ChatGPT connector directory — submit when the public form is open
- [ ] LangChain + CrewAI + LlamaIndex community tool lists — PR adding an Agent Nexus tool wrapper

### awesome-mcp-servers PR line

```md
- [Agent Nexus](https://agentnexus.app) 🌐 ☁️ — Continuously verified registry of the APIs, MCP servers and CLIs agents call; maps a plain-language need to a callable interface with auth, formats, limits and a live reliability score. Anonymous read-only endpoint, no consent screen.
```

### Suggested launch post (Hacker News / X / LinkedIn)

> The next billion internet users won't be humans, they'll be agents — and
> they don't browse, they call interfaces. Agent Nexus indexes those
> interfaces (APIs, MCP servers, CLIs), probes them continuously, and answers
> one question: "what can actually do this, right now, and how do I call it?"
> Free to read, no login, connect over MCP at
> https://agentnexus.app/api/public/mcp
