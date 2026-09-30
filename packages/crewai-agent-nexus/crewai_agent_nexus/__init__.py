"""CrewAI tools for the Agent Nexus registry of APIs, MCP servers and CLIs."""

from .client import AgentNexusClient, AgentNexusError
from .tools import (
    AgentNexusDiscoverTool,
    AgentNexusEntryTool,
    AgentNexusReportTool,
    get_agent_nexus_tools,
)

__all__ = [
    "AgentNexusClient",
    "AgentNexusError",
    "AgentNexusDiscoverTool",
    "AgentNexusEntryTool",
    "AgentNexusReportTool",
    "get_agent_nexus_tools",
]

__version__ = "0.1.0"
