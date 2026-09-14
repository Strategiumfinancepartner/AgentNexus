ALTER TABLE public.api_keys
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN kind text NOT NULL DEFAULT 'user',
  ADD COLUMN agent_label text NOT NULL DEFAULT '';

CREATE INDEX api_keys_kind_created_idx ON public.api_keys (kind, created_at DESC);