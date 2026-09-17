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
- [x] Smithery — **en ligne, vérifié 17 sept 2026** : https://smithery.ai/server/ceo-2z03/agent-nexus (chercher « agentnexus », pas « agent nexus » — la recherche avec espace ne le trouve pas)
- [x] Glama — **en ligne, vérifié 17 sept 2026** : https://glama.ai/mcp/servers?query=agentnexus
- [ ] mcp.so — soumission payante uniquement (~39 $) → **abandonné**, pas d'action
- [x] PulseMCP — soumissions en pause depuis le 3 sept 2026 ; récupération automatique depuis le registre MCP officiel (où nous sommes déjà) — rien à faire
- [ ] Cursor Directory — https://cursor.directory/mcp (PR or form)
- [x] awesome-remote-mcp-servers — **PR ouverte 16 sept 2026 : https://github.com/punkpeye/awesome-remote-mcp-servers/pull/369** (dépôt étoilé + fork + branche `add-agent-nexus`, section Aggregators, badge Glama inclus, titre avec 🤖🤖🤖 pour fusion rapide)
- [x] mcp.directory — soumis 17 sept 2026 (« Server Submitted », publication annoncée sous 24 h)
- [x] mcpservers.org — soumis 17 sept 2026, offre gratuite (« Submission Successful », revue sous 12 h)
- [ ] MCPFind — refusé en l'état : exige un paquet publié npm/PyPI/Docker, or le serveur est remote-only
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

### Public repository

GitHub (code source, public) : https://github.com/Strategiumfinancepartner/AgentNexus — à coller dans tout formulaire demandant un dépôt (mcp.so, awesome-mcp-servers, etc.). Contient uniquement des clés publiques (anon key, token navigateur) — vérifié le 16 sept 2026.

### Fiche GitHub — à coller dans "Edit repository details"

**Description** (350 max) :

```
Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call — live health checks, reliability history, and an anonymous MCP endpoint agents can connect to without a consent screen.
```

**Website** :

```
https://agentnexus.app
```

**Topics** :

```
mcp model-context-protocol mcp-server ai-agents agent-infrastructure api-registry llm-tools openapi tanstack-start typescript agentic-ai tool-discovery
```

### awesome-mcp-servers — procédure PR (✅ fait le 16 sept 2026 — mais sur awesome-remote-mcp-servers, PR #369 : la liste « awesome-mcp-servers » est réservée aux serveurs à installer soi-même)

Dépôt cible : https://github.com/punkpeye/awesome-mcp-servers

1. Ouvrir le dépôt → bouton **Fork** (en haut à droite).
2. Dans le fork, ouvrir `README.md` → icône crayon (**Edit this file**).
3. Chercher la section thématique la plus proche (`🔎 Search & Data Extraction`
   ou `🛠️ Other Tools and Integrations`) et insérer la ligne ci-dessous **dans
   l'ordre alphabétique** parmi ses voisines.
4. Bas de page → **Commit changes** → message `Add Agent Nexus` → **Propose changes**.
5. **Create pull request** → titre `Add Agent Nexus` → dans le corps, coller le
   paragraphe de justification ci-dessous → **Create pull request**.

Ligne à insérer (légende du dépôt : 🌐 = serveur distant, ☁️ = service cloud) :

```md
- [Agent Nexus](https://agentnexus.app) 🌐 ☁️ - Continuously verified registry of the APIs, MCP servers and CLIs agents call; maps a plain-language need to a callable interface with auth, formats, limits and a live reliability score. Anonymous read-only endpoint, no consent screen.
```

Justification à coller dans le corps de la PR :

> Agent Nexus is a remote MCP server that helps an agent find which interface can
> actually perform a task right now. Entries are probed over HTTP on a schedule, so
> results carry a live reliability score rather than a static description.
>
> - Endpoint (anonymous, no key, Streamable HTTP): https://agentnexus.app/api/public/mcp
> - Tools: `discover_capabilities`, `search_registry`, `get_entry`, `list_categories`
> - Already listed on the official MCP registry as `app.agentnexus/agent-nexus`, on Smithery and on Glama
> - Source: https://github.com/Strategiumfinancepartner/AgentNexus
