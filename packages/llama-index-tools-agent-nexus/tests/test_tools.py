import httpx

from llama_index.tools.agent_nexus import AgentNexusClient, AgentNexusToolSpec

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


def _spec(handler):
    client = AgentNexusClient(client=httpx.Client(transport=httpx.MockTransport(handler)))
    return AgentNexusToolSpec(client=client)


def test_discover():
    out = _spec(lambda r: httpx.Response(200, json=DISCOVER)).discover("photo to 3d model")
    assert out["matches"][0]["slug"] == "imagetostl"
    assert out["matches"][0]["endpoint"] == "https://imagetostl.com/api"


def test_get_entry():
    payload = {"entry": {"slug": "imagetostl", "name": "ImageToSTL"}}
    assert _spec(lambda r: httpx.Response(200, json=payload)).get_entry("imagetostl")["name"] == "ImageToSTL"


def test_report():
    assert _spec(lambda r: httpx.Response(200, json={"recorded": True})).report("imagetostl", True)["recorded"] is True


def test_quota_error_is_returned_as_data():
    out = _spec(lambda r: httpx.Response(429, text="slow down")).discover("anything")
    assert "quota" in out["error"]


def test_tool_list_exposes_three_tools():
    names = {t.metadata.name for t in _spec(lambda r: httpx.Response(200, json=DISCOVER)).to_tool_list()}
    assert names == {"discover", "get_entry", "report"}
