CREATE INDEX IF NOT EXISTS health_checks_entry_checked_idx ON public.health_checks (entry_id, checked_at DESC);

GRANT SELECT ON public.health_checks TO anon;

DROP POLICY IF EXISTS "Anyone can read health of approved entries" ON public.health_checks;
CREATE POLICY "Anyone can read health of approved entries"
ON public.health_checks FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.entries e WHERE e.id = health_checks.entry_id AND e.status = 'approved'));

CREATE OR REPLACE FUNCTION public.public_uptime_daily(_days integer DEFAULT 30)
RETURNS TABLE(slug text, day date, checks integer, ok integer, avg_latency integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.slug,
         ((h.checked_at AT TIME ZONE 'utc')::date) AS day,
         count(*)::int AS checks,
         count(*) FILTER (WHERE h.ok)::int AS ok,
         avg(h.latency_ms)::int AS avg_latency
  FROM public.health_checks h
  JOIN public.entries e ON e.id = h.entry_id
  WHERE e.status = 'approved'
    AND h.checked_at > now() - make_interval(days => least(greatest(coalesce(_days, 30), 1), 90))
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION public.public_uptime_daily(integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_recent_incidents(_limit integer DEFAULT 20)
RETURNS TABLE(slug text, name text, checked_at timestamptz, status_code integer, error text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.slug, e.name, h.checked_at, h.status_code, h.error
  FROM public.health_checks h
  JOIN public.entries e ON e.id = h.entry_id
  WHERE e.status = 'approved'
    AND h.ok = false
    AND h.checked_at > now() - interval '30 days'
  ORDER BY h.checked_at DESC
  LIMIT least(greatest(coalesce(_limit, 20), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.public_recent_incidents(integer) TO anon, authenticated, service_role;