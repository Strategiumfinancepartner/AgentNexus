"""LangChain tools backed by the Agent Nexus registry.

Agent Nexus is a machine-readable registry of callable APIs, MCP servers and
CLIs. These tools let a LangChain agent find a capability it does not have
yet, read the exact call details, and report back how the call went.
"""

from .client import AgentNexusClient
from .tools import (
    AgentNexusDiscoverTool,
    AgentNexusEntryTool,
    AgentNexusReportTool,
    get_agent_nexus_tools,
)
from .toolkit import AgentNexusToolkit

__all__ = [
    "AgentNexusClient",
    "AgentNexusDiscoverTool",
    "AgentNexusEntryTool",
    "AgentNexusReportTool",
    "AgentNexusToolkit",
    "get_agent_nexus_tools",
]

__version__ = "0.1.0"
