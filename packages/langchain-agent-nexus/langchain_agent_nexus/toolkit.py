"""Toolkit wrapper so the tools can be added in one line."""

from __future__ import annotations

from typing import List, Optional

from langchain_core.tools import BaseTool
from langchain_core.tools.base import BaseToolkit
from pydantic import Field

from .client import AgentNexusClient
from .tools import get_agent_nexus_tools


class AgentNexusToolkit(BaseToolkit):
    """Agent Nexus registry toolkit.

    Example:
        >>> from langchain_agent_nexus import AgentNexusToolkit
        >>> tools = AgentNexusToolkit().get_tools()
    """

    client: AgentNexusClient = Field(default_factory=AgentNexusClient)

    model_config = {"arbitrary_types_allowed": True}

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, **kwargs) -> None:
        if "client" not in kwargs:
            kwargs["client"] = AgentNexusClient(api_key=api_key, base_url=base_url)
        super().__init__(**kwargs)

    def get_tools(self) -> List[BaseTool]:
        return get_agent_nexus_tools(client=self.client)
