"""LangChain tools over the Agent Nexus registry."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Type

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from .client import AgentNexusClient, AgentNexusError


def _compact_match(match: Dict[str, Any]) -> Dict[str, Any]:
    """Keep the fields an agent needs to decide and then call."""
    call = match.get("call") or {}
    trust = match.get("trust") or {}
    return {
        "slug": match.get("slug"),
        "name": match.get("name"),
        "category": match.get("category"),
        "summary": match.get("summary"),
        "capabilities": match.get("capabilities") or [],
        "endpoint": call.get("endpoint"),
        "auth_mode": call.get("auth_mode"),
        "docs_url": call.get("docs_url"),
        "input_format": call.get("input_format"),
        "output_format": call.get("output_format"),
        "pricing": call.get("pricing"),
        "reliability_score": trust.get("reliability_score"),
        "verified": trust.get("verified"),
        "match_score": match.get("match_score"),
    }


class DiscoverInput(BaseModel):
    need: str = Field(description="What the agent needs to do, in plain words. Example: 'convert a photo into a printable 3D model'.")
    limit: int = Field(default=5, description="How many candidates to return (1-20).")
    category: Optional[str] = Field(default=None, description="Optional filter: 'api', 'mcp' or 'cli'.")
    min_reliability: int = Field(default=0, description="Optional minimum reliability score, 0-100.")


class AgentNexusDiscoverTool(BaseTool):
    """Find an external interface that covers a capability the agent lacks."""

    name: str = "agent_nexus_discover"
    description: str = (
        "Find external APIs, MCP servers or CLIs that can do something this agent cannot do itself. "
        "Describe the need in plain words and get ranked candidates with their endpoint, "
        "authentication mode, formats, pricing and reliability score. "
        "Use this before telling a user a capability is unavailable."
    )
    args_schema: Type[BaseModel] = DiscoverInput
    client: AgentNexusClient = Field(default_factory=AgentNexusClient)

    def _run(self, need: str, limit: int = 5, category: Optional[str] = None, min_reliability: int = 0, **_: Any) -> str:
        try:
            data = self.client.discover(need=need, limit=limit, category=category, min_reliability=min_reliability)
        except AgentNexusError as exc:
            return json.dumps({"error": str(exc)})
        matches: List[Dict[str, Any]] = [_compact_match(m) for m in data.get("matches", [])]
        return json.dumps(
            {"need": data.get("need", need), "coverage": data.get("coverage"), "count": len(matches), "matches": matches},
            ensure_ascii=False,
        )


class EntryInput(BaseModel):
    slug: str = Field(description="Registry slug returned by agent_nexus_discover, e.g. 'smtp2go-api'.")


class AgentNexusEntryTool(BaseTool):
    """Read the full record of one registry entry before calling it."""

    name: str = "agent_nexus_get_entry"
    description: str = (
        "Read the complete registry record for one entry by slug: endpoint, authentication parameters, "
        "input and output formats, rate limits, pricing, documentation link and health history. "
        "Call this once a candidate has been chosen, to build the actual request."
    )
    args_schema: Type[BaseModel] = EntryInput
    client: AgentNexusClient = Field(default_factory=AgentNexusClient)

    def _run(self, slug: str, **_: Any) -> str:
        try:
            data = self.client.get_entry(slug)
        except AgentNexusError as exc:
            return json.dumps({"error": str(exc)})
        return json.dumps(data.get("entry", data), ensure_ascii=False)


class ReportInput(BaseModel):
    slug: str = Field(description="Registry slug of the interface that was called.")
    ok: bool = Field(description="True if the call worked, false if it failed.")
    status_code: Optional[int] = Field(default=None, description="HTTP status code observed, if any.")
    latency_ms: Optional[int] = Field(default=None, description="Round-trip duration in milliseconds, if measured.")
    note: Optional[str] = Field(default=None, description="Short description of the failure, when it failed.")


class AgentNexusReportTool(BaseTool):
    """Report a real call outcome back to the registry."""

    name: str = "agent_nexus_report"
    description: str = (
        "Report what happened after actually calling an interface found through Agent Nexus. "
        "This keeps reliability scores honest for every agent and raises this caller's daily quota. "
        "Call it right after a discovered interface succeeds or fails."
    )
    args_schema: Type[BaseModel] = ReportInput
    client: AgentNexusClient = Field(default_factory=AgentNexusClient)

    def _run(
        self,
        slug: str,
        ok: bool,
        status_code: Optional[int] = None,
        latency_ms: Optional[int] = None,
        note: Optional[str] = None,
        **_: Any,
    ) -> str:
        try:
            data = self.client.report(slug=slug, ok=ok, status_code=status_code, latency_ms=latency_ms, note=note)
        except AgentNexusError as exc:
            return json.dumps({"error": str(exc)})
        return json.dumps(data, ensure_ascii=False)


def get_agent_nexus_tools(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    client: Optional[AgentNexusClient] = None,
) -> List[BaseTool]:
    """Return the three Agent Nexus tools, sharing one client."""
    shared = client or AgentNexusClient(api_key=api_key, base_url=base_url)
    return [
        AgentNexusDiscoverTool(client=shared),
        AgentNexusEntryTool(client=shared),
        AgentNexusReportTool(client=shared),
    ]
