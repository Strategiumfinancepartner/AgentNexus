REVOKE ALL ON FUNCTION public.enforce_entry_submission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_health_check() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;