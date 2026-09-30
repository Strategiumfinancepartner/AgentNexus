# llama-index-tools-agent-nexus

A LlamaIndex tool spec that lets your agents find and call external interfaces — REST APIs, MCP servers and CLIs — through the [Agent Nexus](https://agentnexus.app) registry.

```bash
pip install llama-index-tools-agent-nexus
```

## Usage

```python
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai import OpenAI
from llama_index.tools.agent_nexus import AgentNexusToolSpec

tools = AgentNexusToolSpec().to_tool_list()
agent = FunctionAgent(tools=tools, llm=OpenAI(model="gpt-4.1-mini"))
```

An API key is optional. Without one the registry serves anonymous traffic at a lower daily quota; a free key at <https://agentnexus.app/keys> raises it.

```python
tools = AgentNexusToolSpec(api_key="ank_...").to_tool_list()  # or set AGENT_NEXUS_API_KEY
```

## Tools

| Tool | What it does |
| --- | --- |
| `discover` | Describe a need in plain words, get ranked candidates with endpoint, auth mode, formats, pricing and reliability score. |
| `get_entry` | Read one entry's full record before building the request. |
| `report` | Report whether a real call succeeded, which keeps reliability scores honest and raises your quota. |

## License

MIT
