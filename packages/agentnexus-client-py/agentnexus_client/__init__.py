"""Agent Nexus client: find a working API, MCP server or CLI in 3 lines.

    from agentnexus_client import AgentNexus
    nexus = AgentNexus()
    best = nexus.find("send a transactional email")

No dependencies, no account. A free key raises the daily quota.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

__version__ = "0.1.0"
__all__ = ["AgentNexus", "AgentNexusError", "__version__"]

DEFAULT_BASE_URL = "https://agentnexus.app"
MCP_URL = "https://agentnexus.app/api/public/mcp"


class AgentNexusError(RuntimeError):
    """Raised when the registry cannot answer."""

    def __init__(self, message: str, status: Optional[int] = None) -> None:
        super().__init__(message)
        self.status = status


class AgentNexus:
    """Client for the Agent Nexus public registry.

    ``api_key`` is optional (env ``AGENT_NEXUS_API_KEY``). Without it you get
    the anonymous quota; ``AgentNexus.create_key()`` mints a free key.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 20.0) -> None:
        self.api_key = api_key or os.environ.get("AGENT_NEXUS_API_KEY")
        self.base_url = (base_url or os.environ.get("AGENT_NEXUS_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout

    # -- plumbing ---------------------------------------------------------
    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None,
                 params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = self.base_url + path
        if params:
            clean = {k: v for k, v in params.items() if v not in (None, "")}
            if clean:
                url += "?" + urllib.parse.urlencode(clean)
        headers = {"accept": "application/json", "user-agent": f"agentnexus-client-py/{__version__}"}
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["content-type"] = "application/json"
        if self.api_key:
            headers["x-api-key"] = self.api_key
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", "replace")[:300]
            if exc.code == 429:
                raise AgentNexusError("Daily quota reached. Mint a free key with AgentNexus.create_key().", 429) from exc
            raise AgentNexusError(f"Agent Nexus returned {exc.code}: {text}", exc.code) from exc
        except urllib.error.URLError as exc:
            raise AgentNexusError(f"Agent Nexus request failed: {exc.reason}") from exc
        try:
            return json.loads(raw)
        except ValueError as exc:
            raise AgentNexusError("Agent Nexus returned a non-JSON response") from exc

    # -- public surface ----------------------------------------------------
    def discover(self, need: str, limit: int = 5, category: Optional[str] = None,
                 min_reliability: int = 0) -> Dict[str, Any]:
        """Rank interfaces for a plain-language need. Returns the full response."""
        body: Dict[str, Any] = {"need": need, "limit": limit}
        if category:
            body["category"] = category
        if min_reliability:
            body["min_reliability"] = min_reliability
        return self._request("POST", "/api/public/discover", body=body)

    def find(self, need: str, **kwargs: Any) -> Optional[Dict[str, Any]]:
        """Best single match for a need, or None."""
        matches: List[Dict[str, Any]] = self.discover(need, **kwargs).get("matches") or []
        return matches[0] if matches else None

    def search(self, query: str = "", category: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """Keyword search across the catalogue."""
        return self._request("GET", "/api/public/registry", params={"q": query, "category": category, "limit": limit})

    def get_entry(self, slug: str) -> Dict[str, Any]:
        """Full record for one entry."""
        return self._request("GET", "/api/public/registry/" + urllib.parse.quote(slug))

    def health_card(self, slug: str) -> Dict[str, Any]:
        """Agent-facing health card: last probe, transport, auth, schema hash, expiry."""
        return self._request("GET", "/api/public/health-card/" + urllib.parse.quote(slug))

    def report(self, slug: str, ok: bool, status_code: Optional[int] = None,
               latency_ms: Optional[int] = None, note: Optional[str] = None) -> Dict[str, Any]:
        """Report a real call outcome so reliability scores stay honest."""
        body: Dict[str, Any] = {"slug": slug, "outcome": "success" if ok else "failure"}
        if status_code is not None:
            body["status_code"] = int(status_code)
        if latency_ms is not None:
            body["latency_ms"] = int(latency_ms)
        if note:
            body["error"] = note[:500]
        return self._request("POST", "/api/public/report", body=body)

    @classmethod
    def create_key(cls, agent: str = "agentnexus-client-py", purpose: Optional[str] = None,
                   base_url: Optional[str] = None) -> str:
        """Mint a free API key (1,000 calls/day). No account needed."""
        body: Dict[str, Any] = {"agent": agent}
        if purpose:
            body["purpose"] = purpose
        res = cls(base_url=base_url)._request("POST", "/api/public/keys", body=body)
        key = res.get("api_key") or res.get("key")
        if not key:
            raise AgentNexusError("No key in response")
        return key
