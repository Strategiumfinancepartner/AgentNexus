-- anon can already read approved entries and their health checks under RLS, so
-- these two public surfaces do not need elevated privileges at all.
CREATE OR REPLACE FUNCTION public.public_uptime_daily(_days integer DEFAULT 30)
 RETURNS TABLE(slug text, day date, checks integer, ok integer, avg_latency integer)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.public_recent_incidents(_limit integer DEFAULT 20)
 RETURNS TABLE(slug text, name text, checked_at timestamp with time zone, status_code integer, error text)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT e.slug, e.name, h.checked_at, h.status_code, h.error
  FROM public.health_checks h
  JOIN public.entries e ON e.id = h.entry_id
  WHERE e.status = 'approved'
    AND h.ok = false
    AND h.checked_at > now() - interval '30 days'
  ORDER BY h.checked_at DESC
  LIMIT least(greatest(coalesce(_limit, 20), 1), 100);
$function$;

GRANT EXECUTE ON FUNCTION public.public_uptime_daily(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_recent_incidents(integer) TO anon, authenticated, service_role;

-- No RLS policy is evaluated as anon uses has_role, so anon has no reason to call it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;