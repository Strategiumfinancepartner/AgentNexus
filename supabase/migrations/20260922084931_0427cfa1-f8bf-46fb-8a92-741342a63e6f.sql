REVOKE ALL ON FUNCTION public.record_error_event(text, text, text, integer, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_error_event(text, text, text, integer, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_error_event(text, text, text, integer, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_error_event(text, text, text, integer, text, text, text, text) TO service_role;