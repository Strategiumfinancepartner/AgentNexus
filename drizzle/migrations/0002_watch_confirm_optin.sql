ALTER TABLE public.tool_watches ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.tool_watches ADD COLUMN IF NOT EXISTS confirm_token text;
CREATE INDEX IF NOT EXISTS tool_watches_confirm_token_idx ON public.tool_watches (confirm_token);