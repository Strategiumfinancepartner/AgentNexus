UPDATE public.entries
SET probe_url = 'https://dictionaryapi.dev/',
    rate_limit = COALESCE(NULLIF(rate_limit, ''), 'Unmetered but aggressively throttled: bursts and unattended probes get dropped. Retry with backoff.'),
    health_ok = NULL,
    health_status_code = NULL,
    health_latency_ms = NULL,
    health_checked_at = NULL
WHERE slug = 'free-dictionary-api';