"""Thin HTTP client for the Agent Nexus public registry API."""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

import httpx

DEFAULT_BASE_URL = "https://agentnexus.app"
USER_AGENT = "crewai-agent-nexus/0.1.0"


class AgentNexusError(RuntimeError):
    """Raised when the registry cannot answer a request."""


class AgentNexusClient:
    """Calls the Agent Nexus public endpoints.

    An API key is optional. Without one, the registry serves anonymous
    traffic at a lower daily quota; a free key raises it. Set
    ``AGENT_NEXUS_API_KEY`` in the environment or pass ``api_key``.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 20.0,
        client: Optional[httpx.Client] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("AGENT_NEXUS_API_KEY")
        self.base_url = (base_url or os.environ.get("AGENT_NEXUS_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        self._client = client

    # ---- HTTP plumbing -------------------------------------------------
    def _headers(self) -> Dict[str, str]:
        headers = {"user-agent": USER_AGENT, "accept": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key
        return headers

    def _request(self, method: str, path: str, **kwargs: Any) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            if self._client is not None:
                response = self._client.request(method, url, headers=self._headers(), timeout=self.timeout, **kwargs)
            else:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.request(method, url, headers=self._headers(), **kwargs)
        except httpx.HTTPError as exc:  # network, DNS, timeout
            raise AgentNexusError(f"Agent Nexus request failed: {exc}") from exc

        if response.status_code == 429:
            raise AgentNexusError(
                "Agent Nexus daily quota reached. Get a free key at "
                "https://agentnexus.app/keys to raise it."
            )
        if response.status_code >= 400:
            raise AgentNexusError(
                f"Agent Nexus returned {response.status_code}: {response.text[:300]}"
            )
        try:
            return response.json()
        except ValueError as exc:
            raise AgentNexusError("Agent Nexus returned a non-JSON response") from exc

    # ---- Public surface ------------------------------------------------
    def discover(
        self,
        need: str,
        limit: int = 5,
        category: Optional[str] = None,
        min_reliability: int = 0,
    ) -> Dict[str, Any]:
        """Rank registry entries against a capability described in plain words."""
        payload: Dict[str, Any] = {"need": need, "limit": limit}
        if category:
            payload["category"] = category
        if min_reliability:
            payload["min_reliability"] = min_reliability
        return self._request("POST", "/api/public/discover", json=payload)

    def get_entry(self, slug: str) -> Dict[str, Any]:
        """Return the full record for one registry entry."""
        return self._request("GET", f"/api/public/registry/{slug}")

    def search(self, query: str = "", category: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """Keyword search across the catalogue."""
        params: Dict[str, Any] = {"limit": limit}
        if query:
            params["q"] = query
        if category:
            params["category"] = category
        return self._request("GET", "/api/public/registry", params=params)

    def report(
        self,
        slug: str,
        ok: bool,
        status_code: Optional[int] = None,
        latency_ms: Optional[int] = None,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Report the outcome of a real call so reliability scores stay honest."""
        payload: Dict[str, Any] = {"slug": slug, "outcome": "success" if ok else "failure"}
        if status_code is not None:
            payload["status_code"] = int(status_code)
        if latency_ms is not None:
            payload["latency_ms"] = int(latency_ms)
        if note:
            payload["error"] = note[:500]
        return self._request("POST", "/api/public/report", json=payload)
