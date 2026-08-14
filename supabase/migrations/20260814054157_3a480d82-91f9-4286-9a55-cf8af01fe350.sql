REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.trigger_health_check_run() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_health_check_run() TO postgres, service_role;