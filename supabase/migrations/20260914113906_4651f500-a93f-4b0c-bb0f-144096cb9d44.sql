CREATE TABLE public.access_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  surface text NOT NULL,
  path text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  tier text NOT NULL DEFAULT 'anon',
  actor text NOT NULL DEFAULT 'unknown',
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent text NOT NULL DEFAULT '',
  referer text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.access_events TO service_role;

ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX access_events_created_at_idx ON public.access_events (created_at DESC);
CREATE INDEX access_events_surface_created_idx ON public.access_events (surface, created_at DESC);
CREATE INDEX access_events_actor_created_idx ON public.access_events (actor, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_access_event(
  _surface text,
  _path text,
  _method text,
  _tier text,
  _actor text,
  _api_key_id uuid,
  _user_id uuid,
  _user_agent text,
  _referer text,
  _country text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.access_events (surface, path, method, tier, actor, api_key_id, user_id, user_agent, referer, country)
  VALUES (
    left(coalesce(_surface, 'other'), 60),
    left(coalesce(_path, '/'), 300),
    left(coalesce(_method, 'GET'), 10),
    left(coalesce(_tier, 'anon'), 10),
    left(coalesce(_actor, 'unknown'), 120),
    _api_key_id,
    _user_id,
    left(coalesce(_user_agent, ''), 300),
    left(coalesce(_referer, ''), 300),
    left(coalesce(_country, ''), 10)
  );

  IF random() < 0.01 THEN
    DELETE FROM public.access_events WHERE created_at < now() - interval '60 days';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_access_event(text, text, text, text, text, uuid, uuid, text, text, text) FROM anon, authenticated;