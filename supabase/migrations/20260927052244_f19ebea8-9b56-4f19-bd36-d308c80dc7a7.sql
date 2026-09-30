ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS schema_ok boolean,
  ADD COLUMN IF NOT EXISTS schema_detail text,
  ADD COLUMN IF NOT EXISTS schema_checked_at timestamptz;