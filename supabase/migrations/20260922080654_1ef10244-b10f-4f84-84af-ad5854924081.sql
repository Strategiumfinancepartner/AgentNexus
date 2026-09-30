REVOKE ALL ON FUNCTION public.grant_report_credit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_report_credit(text) FROM anon;
REVOKE ALL ON FUNCTION public.grant_report_credit(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_report_credit(text) TO service_role;

REVOKE ALL ON FUNCTION public.bump_entry_reports() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_entry_reports() FROM anon;
REVOKE ALL ON FUNCTION public.bump_entry_reports() FROM authenticated;