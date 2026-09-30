-- The default EXECUTE grant to PUBLIC is what still exposed these; revoke it.
REVOKE EXECUTE ON FUNCTION public.consume_api_quota(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_access_event(text, text, text, text, text, uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_reputation(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.public_uptime_daily(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.public_recent_incidents(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.consume_api_quota(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_access_event(text, text, text, text, text, uuid, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reputation(uuid) TO authenticated, service_role;
-- Referenced by RLS policies evaluated as anon and authenticated.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
-- Public status page surfaces.
GRANT EXECUTE ON FUNCTION public.public_uptime_daily(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_recent_incidents(integer) TO anon, authenticated, service_role;