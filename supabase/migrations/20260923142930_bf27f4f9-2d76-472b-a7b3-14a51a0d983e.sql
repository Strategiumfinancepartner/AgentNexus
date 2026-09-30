CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid
      and environment = check_env
      and (
        (status in ('active','trialing','past_due') and (current_period_end is null or current_period_end > now()))
        or (status = 'canceled' and current_period_end > now())
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_reputation(_user_id uuid)
 RETURNS TABLE(approved_entries integer, votes_received integer)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT count(*)::int FROM public.entries e
      WHERE e.submitted_by = _user_id AND e.status = 'approved'),
    (SELECT count(*)::int FROM public.entry_votes v
      JOIN public.entries e ON e.id = v.entry_id
      WHERE e.submitted_by = _user_id AND e.status = 'approved');
$function$;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_reputation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reputation(uuid) TO authenticated, service_role;