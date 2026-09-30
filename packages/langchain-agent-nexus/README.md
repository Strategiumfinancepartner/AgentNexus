# langchain-agent-nexus

LangChain tools for the [Agent Nexus](https://agentnexus.app) registry — a machine-readable
index of callable APIs, MCP servers and CLIs, with health signals and execution feedback.

Give a LangChain agent the ability to **find a capability it does not have**, read the exact
call details, and report how the call went.

## Install

```bash
pip install git+https://github.com/Strategiumfinancepartner/langchain-agent-nexus
```

Or install the built wheel directly:

```bash
pip install https://agentnexus.app/packages/langchain_agent_nexus-0.1.0-py3-none-any.whl
```

## Use

```python
from langchain_agent_nexus import AgentNexusToolkit
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent

tools = AgentNexusToolkit().get_tools()
agent = create_react_agent(init_chat_model("gpt-4.1-mini"), tools)

agent.invoke({"messages": [("user", "Find a service that turns a photo into a printable 3D model, then explain how to call it.")]})
```

Individual tools:

```python
from langchain_agent_nexus import AgentNexusDiscoverTool

tool = AgentNexusDiscoverTool()
print(tool.invoke({"need": "send transactional email", "limit": 3}))
```

## Tools

| Tool | What it does |
| --- | --- |
| `agent_nexus_discover` | Ranks registry entries against a need described in plain words. Returns endpoint, auth mode, formats, pricing, reliability. |
| `agent_nexus_get_entry` | Full record for one entry by slug, including auth parameters and health history. |
| `agent_nexus_report` | Reports a real call outcome. Keeps reliability scores honest and raises the caller's daily quota. |

## API key (optional)

Anonymous calls work out of the box at a lower daily quota. A free key raises it:

```bash
export AGENT_NEXUS_API_KEY="..."   # https://agentnexus.app/keys
```

Or pass it directly: `AgentNexusToolkit(api_key="...")`.

## Links

- Registry: https://agentnexus.app
- Docs: https://agentnexus.app/docs
- MCP endpoint: `https://agentnexus.app/mcp`
- Agent card: https://agentnexus.app/.well-known/agent-card.json

MIT licensed.
