"""LlamaIndex tool spec over the Agent Nexus registry."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from llama_index.core.tools.tool_spec.base import BaseToolSpec

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


class AgentNexusToolSpec(BaseToolSpec):
    """Discover, inspect and rate external APIs, MCP servers and CLIs.

    An API key is optional: without one the registry serves anonymous traffic
    at a lower daily quota. Set ``AGENT_NEXUS_API_KEY`` or pass ``api_key``.
    """

    spec_functions = ["discover", "get_entry", "report"]

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        client: Optional[AgentNexusClient] = None,
    ) -> None:
        self.client = client or AgentNexusClient(api_key=api_key, base_url=base_url)

    def discover(
        self,
        need: str,
        limit: int = 5,
        category: Optional[str] = None,
        min_reliability: int = 0,
    ) -> Dict[str, Any]:
        """Find external APIs, MCP servers or CLIs that can do something this agent cannot do itself.

        Describe the need in plain words, for example "convert a photo into a printable
        3D model". Returns ranked candidates with endpoint, authentication mode, input and
        output formats, pricing and reliability score. Use this before telling a user a
        capability is unavailable.

        Args:
            need: The capability required, in plain words.
            limit: How many candidates to return (1-20).
            category: Optional filter, one of "api", "mcp" or "cli".
            min_reliability: Optional minimum reliability score, 0-100.
        """
        try:
            data = self.client.discover(need=need, limit=limit, category=category, min_reliability=min_reliability)
        except AgentNexusError as exc:
            return {"error": str(exc)}
        matches: List[Dict[str, Any]] = [_compact_match(m) for m in data.get("matches", [])]
        return {
            "need": data.get("need", need),
            "coverage": data.get("coverage"),
            "count": len(matches),
            "matches": matches,
        }

    def get_entry(self, slug: str) -> Dict[str, Any]:
        """Read the complete registry record for one entry by slug.

        Returns endpoint, authentication parameters, input and output formats, rate limits,
        pricing, documentation link and health history. Call this once a candidate has been
        chosen, to build the actual request.

        Args:
            slug: Registry slug returned by discover, e.g. "smtp2go-api".
        """
        try:
            data = self.client.get_entry(slug)
        except AgentNexusError as exc:
            return {"error": str(exc)}
        return data.get("entry", data)

    def report(
        self,
        slug: str,
        ok: bool,
        status_code: Optional[int] = None,
        latency_ms: Optional[int] = None,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Report what happened after actually calling an interface found through Agent Nexus.

        This keeps reliability scores honest for every agent and raises this caller's daily
        quota. Call it right after a discovered interface succeeds or fails.

        Args:
            slug: Registry slug of the interface that was called.
            ok: True if the call worked, false if it failed.
            status_code: HTTP status code observed, if any.
            latency_ms: Round-trip duration in milliseconds, if measured.
            note: Short description of the failure, when it failed.
        """
        try:
            return self.client.report(slug=slug, ok=ok, status_code=status_code, latency_ms=latency_ms, note=note)
        except AgentNexusError as exc:
            return {"error": str(exc)}
