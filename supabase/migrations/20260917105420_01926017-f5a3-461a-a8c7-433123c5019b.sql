CREATE TABLE IF NOT EXISTS public.entry_aliases (
  from_slug text PRIMARY KEY,
  to_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entry_aliases TO anon;
GRANT SELECT ON public.entry_aliases TO authenticated;
GRANT ALL ON public.entry_aliases TO service_role;
ALTER TABLE public.entry_aliases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entry_aliases' AND policyname='Aliases are public') THEN
    CREATE POLICY "Aliases are public" ON public.entry_aliases FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO public.entry_aliases (from_slug, to_slug) VALUES
  ('github-mcp-server','github-mcp'),
  ('github-mcp-remote','github-mcp'),
  ('linear-graphql-api','linear-api'),
  ('openweather-api','openweathermap-api'),
  ('huggingface-mcp','hugging-face-mcp'),
  ('context7-mcp','context7-mcp-server'),
  ('deepwiki-mcp','deepwiki-mcp-server'),
  ('linear-mcp','linear-mcp-server'),
  ('notion-mcp','notion-mcp-server'),
  ('frankfurter-api','frankfurter-fx-api'),
  ('sentry-mcp-server','sentry-mcp'),
  ('cloudflare-docs-mcp','cloudflare-mcp-server')
ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug;

DELETE FROM public.entries WHERE slug IN (SELECT from_slug FROM public.entry_aliases);