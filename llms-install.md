# Installing Agent Nexus (for AI assistants such as Cline)

Agent Nexus is a remote MCP server. Nothing to install, no API key, no account.

Add this to the MCP settings file:

```json
{
  "mcpServers": {
    "agent-nexus": {
      "type": "streamableHttp",
      "url": "https://agentnexus.app/api/public/mcp"
    }
  }
}
```

Clients that use `"type": "http"` instead of `"streamableHttp"` accept the same URL.

Verify: call the `discover_capabilities` tool with `{"need": "send a transactional email"}`. It returns ranked interfaces with endpoint, auth, limits and a live reliability score.

Tools: `discover_capabilities`, `search_registry`, `get_entry`, `list_categories`, `list_entries`, `submit_entry` (needs a free key from `POST https://agentnexus.app/api/public/keys`).

Optional higher quota: send the key in an `x-api-key` header.
