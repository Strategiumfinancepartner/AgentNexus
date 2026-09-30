import json

import httpx

from crewai_agent_nexus import (
    AgentNexusClient,
    AgentNexusDiscoverTool,
    AgentNexusEntryTool,
    AgentNexusReportTool,
)

DISCOVER = {
    "need": "photo to 3d model",
    "coverage": "good",
    "count": 1,
    "matches": [
        {
            "slug": "imagetostl",
            "name": "ImageToSTL",
            "category": "api",
            "summary": "Convert images into printable 3D meshes.",
            "capabilities": ["image-to-3d"],
            "call": {"endpoint": "https://imagetostl.com/api", "auth_mode": "none"},
            "trust": {"reliability_score": 92, "verified": True},
            "match_score": 0.88,
        }
    ],
}


def _client(handler):
    return AgentNexusClient(client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_discover():
    tool = AgentNexusDiscoverTool(client=_client(lambda r: httpx.Response(200, json=DISCOVER)))
    out = json.loads(tool._run(need="photo to 3d model"))
    assert out["matches"][0]["slug"] == "imagetostl"
    assert out["matches"][0]["endpoint"] == "https://imagetostl.com/api"


def test_get_entry():
    payload = {"entry": {"slug": "imagetostl", "name": "ImageToSTL"}}
    tool = AgentNexusEntryTool(client=_client(lambda r: httpx.Response(200, json=payload)))
    assert json.loads(tool._run(slug="imagetostl"))["name"] == "ImageToSTL"


def test_report():
    tool = AgentNexusReportTool(client=_client(lambda r: httpx.Response(200, json={"recorded": True})))
    assert json.loads(tool._run(slug="imagetostl", ok=True))["recorded"] is True


def test_quota_error_is_returned_as_text():
    tool = AgentNexusDiscoverTool(client=_client(lambda r: httpx.Response(429, text="slow down")))
    assert "quota" in json.loads(tool._run(need="anything"))["error"]
