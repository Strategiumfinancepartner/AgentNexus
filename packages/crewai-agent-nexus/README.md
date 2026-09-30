# crewai-agent-nexus

CrewAI tools that let your agents find and call external interfaces — REST APIs, MCP servers and CLIs — through the [Agent Nexus](https://agentnexus.app) registry.

```bash
pip install crewai-agent-nexus
```

## Usage

```python
from crewai import Agent
from crewai_agent_nexus import get_agent_nexus_tools

agent = Agent(
    role="Integrator",
    goal="Find and call the right external service for any missing capability",
    backstory="You extend your own abilities by discovering interfaces in Agent Nexus.",
    tools=get_agent_nexus_tools(),
)
```

An API key is optional. Without one the registry serves anonymous traffic at a lower daily quota; a free key at <https://agentnexus.app/keys> raises it.

```python
tools = get_agent_nexus_tools(api_key="ank_...")   # or set AGENT_NEXUS_API_KEY
```

## Tools

| Tool | What it does |
| --- | --- |
| `agent_nexus_discover` | Describe a need in plain words, get ranked candidates with endpoint, auth mode, formats, pricing and reliability score. |
| `agent_nexus_get_entry` | Read one entry's full record before building the request. |
| `agent_nexus_report` | Report whether a real call succeeded, which keeps reliability scores honest and raises your quota. |

## License

MIT
