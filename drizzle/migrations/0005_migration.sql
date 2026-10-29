CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_entry_alias(_slug text)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.to_slug FROM public.entry_aliases a
  JOIN public.entries e ON e.slug = a.to_slug AND e.status = 'approved'
  WHERE a.from_slug = lower(left(_slug, 120)) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_entry_alias(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Aliases are public" ON public.entry_aliases;
REVOKE SELECT ON public.entry_aliases FROM anon, authenticated;