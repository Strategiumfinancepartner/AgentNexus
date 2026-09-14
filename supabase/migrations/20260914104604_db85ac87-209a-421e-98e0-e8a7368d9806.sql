CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);

GRANT SELECT ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  calls integer NOT NULL DEFAULT 0,
  UNIQUE (actor, day)
);

GRANT ALL ON public.api_usage TO service_role;

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_api_quota(_actor text, _limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  used integer;
BEGIN
  DELETE FROM public.api_usage WHERE day < today - 7;

  SELECT calls INTO used FROM public.api_usage WHERE actor = _actor AND day = today;
  used := coalesce(used, 0);

  IF used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', used, 'limit', _limit);
  END IF;

  INSERT INTO public.api_usage (actor, day, calls) VALUES (_actor, today, 1)
  ON CONFLICT (actor, day) DO UPDATE SET calls = public.api_usage.calls + 1
  RETURNING calls INTO used;

  RETURN jsonb_build_object('allowed', true, 'used', used, 'limit', _limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_quota(text, integer) FROM anon, authenticated;