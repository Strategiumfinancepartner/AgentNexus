-- 1. Contact address a submitter may optionally leave, kept out of the public API.
CREATE TABLE public.submission_contacts (
  entry_id uuid PRIMARY KEY REFERENCES public.entries(id) ON DELETE CASCADE,
  email text NOT NULL,
  notified_at timestamptz,
  notified_decision text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.submission_contacts TO authenticated;
GRANT ALL ON public.submission_contacts TO service_role;

ALTER TABLE public.submission_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can read submission contacts"
  ON public.submission_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- 2. Dedicated counter for failed responses on the machine-facing surfaces.
CREATE TABLE public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surface text NOT NULL DEFAULT 'other',
  path text NOT NULL DEFAULT '/',
  method text NOT NULL DEFAULT 'GET',
  status_code integer NOT NULL,
  tier text NOT NULL DEFAULT 'anon',
  actor text NOT NULL DEFAULT 'unknown',
  user_agent text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX error_events_created_at_idx ON public.error_events (created_at DESC);

GRANT SELECT ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can read error events"
  ON public.error_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.record_error_event(
  _surface text, _path text, _method text, _status integer,
  _tier text, _actor text, _user_agent text, _detail text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.error_events (surface, path, method, status_code, tier, actor, user_agent, detail)
  VALUES (
    left(coalesce(_surface, 'other'), 60),
    left(coalesce(_path, '/'), 300),
    left(coalesce(_method, 'GET'), 10),
    coalesce(_status, 0),
    left(coalesce(_tier, 'anon'), 10),
    left(coalesce(_actor, 'unknown'), 120),
    left(coalesce(_user_agent, ''), 300),
    left(coalesce(_detail, ''), 300)
  );

  IF random() < 0.01 THEN
    DELETE FROM public.error_events WHERE created_at < now() - interval '60 days';
  END IF;
END;
$$;