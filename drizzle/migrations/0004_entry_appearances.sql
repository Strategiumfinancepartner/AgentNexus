CREATE TABLE public.entry_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_slug text NOT NULL,
  source text NOT NULL CHECK (source IN ('mcp_discover','mcp_search','http_discover')),
  rank smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.entry_appearances TO service_role;
ALTER TABLE public.entry_appearances ENABLE ROW LEVEL SECURITY;
CREATE INDEX entry_appearances_slug_time ON public.entry_appearances (entry_slug, created_at DESC);