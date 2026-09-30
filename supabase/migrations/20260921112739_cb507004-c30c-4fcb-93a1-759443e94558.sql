CREATE TABLE public.spam_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor text NOT NULL DEFAULT 'unknown',
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  endpoint text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spam_blocks TO authenticated;
GRANT ALL ON public.spam_blocks TO service_role;
ALTER TABLE public.spam_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviewers can read spam blocks" ON public.spam_blocks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));