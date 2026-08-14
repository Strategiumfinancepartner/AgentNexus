-- 1. Capability probe columns on entries
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS capability_ok boolean,
  ADD COLUMN IF NOT EXISTS capability_detail text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS capability_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS discovered_tools text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'community';

ALTER TABLE public.health_checks
  ADD COLUMN IF NOT EXISTS probe_kind text NOT NULL DEFAULT 'http';

-- 2. Need telemetry
CREATE TABLE IF NOT EXISTS public.need_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need text NOT NULL,
  tokens text[] NOT NULL DEFAULT '{}'::text[],
  category text,
  matched_count integer NOT NULL DEFAULT 0,
  top_slug text,
  source text NOT NULL DEFAULT 'api',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.need_signals TO authenticated;
GRANT ALL ON public.need_signals TO service_role;
ALTER TABLE public.need_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviewers can read need signals" ON public.need_signals;
CREATE POLICY "Reviewers can read need signals"
  ON public.need_signals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS need_signals_created_idx ON public.need_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS need_signals_unmet_idx ON public.need_signals (matched_count, created_at DESC);

-- 3. Invocation failure reports
CREATE TABLE IF NOT EXISTS public.invocation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.entries(id) ON DELETE CASCADE,
  slug text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'failure')),
  status_code integer,
  error text,
  latency_ms integer,
  source text NOT NULL DEFAULT 'api',
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invocation_reports TO authenticated;
GRANT ALL ON public.invocation_reports TO service_role;
ALTER TABLE public.invocation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviewers can read invocation reports" ON public.invocation_reports;
CREATE POLICY "Reviewers can read invocation reports"
  ON public.invocation_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE INDEX IF NOT EXISTS invocation_reports_entry_idx ON public.invocation_reports (entry_id, created_at DESC);

-- 4. Rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rate_limit_events TO service_role;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx
  ON public.rate_limit_events (bucket, actor, created_at DESC);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  _bucket text,
  _actor text,
  _limit integer,
  _window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used integer;
BEGIN
  DELETE FROM public.rate_limit_events
   WHERE created_at < now() - make_interval(secs => _window_seconds * 4);

  SELECT count(*) INTO used
    FROM public.rate_limit_events
   WHERE bucket = _bucket
     AND actor = _actor
     AND created_at > now() - make_interval(secs => _window_seconds);

  IF used >= _limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_events (bucket, actor) VALUES (_bucket, _actor);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO authenticated, service_role;

-- 5. Ops config (internal cron token; never exposed to clients)
CREATE TABLE IF NOT EXISTS public.ops_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ops_config TO service_role;
ALTER TABLE public.ops_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.ops_config (key, value)
VALUES ('cron_token', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 6. Scheduled health + capability probes every 6 hours
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_health_check_run()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  token text;
BEGIN
  SELECT value INTO token FROM public.ops_config WHERE key = 'cron_token';
  IF token IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := 'https://project--c4160740-98d2-49f3-99e6-e8a5b0e07f05.lovable.app/api/public/health-check',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    body := '{"scheduled":true}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_health_check_run() FROM PUBLIC;

SELECT cron.unschedule('agent-nexus-health-check')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agent-nexus-health-check');

SELECT cron.schedule(
  'agent-nexus-health-check',
  '17 */6 * * *',
  $$SELECT public.trigger_health_check_run();$$
);