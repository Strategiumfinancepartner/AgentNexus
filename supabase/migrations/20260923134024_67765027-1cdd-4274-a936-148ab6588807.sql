-- Internal-only SECURITY DEFINER functions: triggers, counters and loggers that
-- must never be callable from the Data API by anon or authenticated clients.
REVOKE EXECUTE ON FUNCTION public.apply_health_check() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_entry_reports() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_entry_submission() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_api_quota(text, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_report_credit(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_access_event(text, text, text, text, text, uuid, uuid, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_error_event(text, text, text, integer, text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_health_check_run() FROM anon, authenticated;

-- Server-side callers use the service role, which keeps working.
GRANT EXECUTE ON FUNCTION public.consume_api_quota(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_report_credit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_access_event(text, text, text, text, text, uuid, uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_error_event(text, text, text, integer, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_health_check_run() TO service_role;

-- Intentionally public surfaces (status page reads them as anon).
GRANT EXECUTE ON FUNCTION public.public_uptime_daily(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_recent_incidents(integer) TO anon, authenticated;

-- Needed by RLS policies and signed-in dashboards.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reputation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_reputation(uuid) FROM anon;