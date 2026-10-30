import unittest

from first_weather_task import DISCOVERY_URL, run


class FirstWeatherTaskTests(unittest.TestCase):
    def discovery(self, endpoint="https://api.brightsky.dev/weather", auth="None"):
        return {"matches": [{"slug": "bright-sky-dwd-api", "call": {
            "endpoint": endpoint, "auth_mode": auth,
        }}]}

    def test_success_requires_a_real_provider_response(self):
        calls = []
        def fetch(url):
            calls.append(url)
            if url == DISCOVERY_URL:
                return self.discovery()
            return {"weather": {"temperature": 7.5, "timestamp": "2026-10-30T08:00:00+00:00", "condition": "fog"}}
        result = run(fetch)
        self.assertEqual(calls, [DISCOVERY_URL, "https://api.brightsky.dev/current_weather?lat=52.52&lon=13.4"])
        self.assertEqual(result["temperature_c"], 7.5)
        self.assertEqual(result["observed_at"], "2026-10-30T08:00:00+00:00")

    def test_missing_match_does_not_call_provider(self):
        calls = []
        def fetch(url):
            calls.append(url)
            return {"matches": []}
        with self.assertRaisesRegex(ValueError, "not returned"):
            run(fetch)
        self.assertEqual(calls, [DISCOVERY_URL])

    def test_changed_auth_does_not_call_provider(self):
        calls = []
        def fetch(url):
            calls.append(url)
            return self.discovery(auth="API key")
        with self.assertRaisesRegex(ValueError, "authentication changed"):
            run(fetch)
        self.assertEqual(calls, [DISCOVERY_URL])

    def test_changed_host_does_not_call_provider(self):
        calls = []
        def fetch(url):
            calls.append(url)
            return self.discovery(endpoint="https://api.brightsky.dev.attacker.example/weather")
        with self.assertRaisesRegex(ValueError, "endpoint changed"):
            run(fetch)
        self.assertEqual(calls, [DISCOVERY_URL])

    def test_incomplete_response_is_not_success(self):
        def fetch(url):
            return self.discovery() if url == DISCOVERY_URL else {"weather": {"temperature": None}}
        with self.assertRaisesRegex(ValueError, "not confirmed"):
            run(fetch)


if __name__ == "__main__":
    unittest.main()