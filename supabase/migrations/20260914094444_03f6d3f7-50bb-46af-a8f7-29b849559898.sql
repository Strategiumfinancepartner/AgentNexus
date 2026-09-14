revoke all on function public.has_active_subscription(uuid, text) from anon;
grant execute on function public.has_active_subscription(uuid, text) to authenticated;