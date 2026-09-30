"""Offline tests: a stub transport stands in for the live registry."""

import json

import httpx

from langchain_agent_nexus import AgentNexusClient, get_agent_nexus_tools

DISCOVER_BODY = {
    "need": "send transactional email",
    "coverage": "exact",
    "count": 1,
    "matches": [
        {
            "slug": "smtp2go-api",
            "name": "SMTP2GO",
            "category": "api",
            "summary": "Transactional email over JSON or SMTP.",
            "match_score": 31.95,
            "capabilities": ["send email"],
            "call": {"endpoint": "https://api.smtp2go.com/v3/email/send", "auth_mode": "API key header"},
            "trust": {"reliability_score": 78, "verified": False},
        }
    ],
}


def _handler(request: httpx.Request) -> httpx.Response:
    if request.url.path == "/api/public/discover":
        return httpx.Response(200, json=DISCOVER_BODY)
    if request.url.path == "/api/public/registry/smtp2go-api":
        return httpx.Response(200, json={"entry": {"slug": "smtp2go-api", "name": "SMTP2GO"}})
    if request.url.path == "/api/public/report":
        return httpx.Response(200, json={"recorded": True})
    return httpx.Response(404, json={"error": "not found"})


def _tools():
    client = AgentNexusClient(client=httpx.Client(transport=httpx.MockTransport(_handler)))
    return {tool.name: tool for tool in get_agent_nexus_tools(client=client)}


def test_discover_returns_compact_matches():
    result = json.loads(_tools()["agent_nexus_discover"].invoke({"need": "send transactional email"}))
    assert result["count"] == 1
    match = result["matches"][0]
    assert match["slug"] == "smtp2go-api"
    assert match["endpoint"] == "https://api.smtp2go.com/v3/email/send"
    assert match["reliability_score"] == 78


def test_get_entry_unwraps_entry():
    result = json.loads(_tools()["agent_nexus_get_entry"].invoke({"slug": "smtp2go-api"}))
    assert result["name"] == "SMTP2GO"


def test_report_maps_ok_to_outcome():
    result = json.loads(_tools()["agent_nexus_report"].invoke({"slug": "smtp2go-api", "ok": True}))
    assert result["recorded"] is True


def test_errors_are_returned_not_raised():
    result = json.loads(_tools()["agent_nexus_get_entry"].invoke({"slug": "missing"}))
    assert "error" in result
