"""Discover Bright Sky through Agent Nexus, then fetch Berlin weather directly.

Run from a repository checkout: python3 examples/first_weather_task.py
No account, API key, package install, write operation, or invocation report.
"""

import json
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

DISCOVERY_URL = "https://agentnexus.app/api/public/discover?" + urlencode(
    {"q": "Bright Sky current weather", "limit": 3}
)


def fetch_json(url):
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "agentnexus-first-task/1.0",
        },
    )
    with urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f"Expected HTTP 200, received {response.status}")
        return json.load(response)


def weather_url(discovery):
    """Validate the returned contract before using this provider-specific recipe."""
    matches = discovery.get("matches", [])
    match = next(
        (item for item in matches if item.get("slug") == "bright-sky-dwd-api"),
        None,
    )
    if match is None:
        raise ValueError("Bright Sky was not returned; no provider was called.")
    contract = match.get("call") or {}
    if contract.get("auth_mode") != "None":
        raise ValueError("Provider authentication changed; no provider was called.")
    endpoint = urlsplit(contract.get("endpoint") or "")
    if (
        endpoint.scheme != "https"
        or endpoint.netloc != "api.brightsky.dev"
        or endpoint.path not in ("/weather", "/current_weather")
        or endpoint.query
        or endpoint.fragment
    ):
        raise ValueError("Provider endpoint changed; review its documentation first.")
    # Bright Sky documents /current_weather for its latest observations;
    # /weather is the general endpoint stored in the returned call contract.
    return urlunsplit(
        ("https", endpoint.netloc, "/current_weather", urlencode({"lat": 52.52, "lon": 13.4}), "")
    )


def run(fetch=fetch_json):
    discovery = fetch(DISCOVERY_URL)
    provider_url = weather_url(discovery)
    data = fetch(provider_url)
    weather = data.get("weather") or {}
    temperature = weather.get("temperature")
    if (
        not isinstance(temperature, (int, float))
        or isinstance(temperature, bool)
        or not weather.get("timestamp")
        or not weather.get("condition")
    ):
        raise ValueError("Provider did not return a complete observation; task not confirmed.")
    return {
        "task": "Current weather in Berlin",
        "provider": "Bright Sky (DWD)",
        "provider_url": provider_url,
        "observed_at": weather["timestamp"],
        "temperature_c": temperature,
        "condition": weather["condition"],
    }


if __name__ == "__main__":
    try:
        print(json.dumps(run(), indent=2))
    except (ValueError, OSError) as error:
        raise SystemExit(f"Task not completed: {error}") from error