CREATE TABLE public.tool_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  email text,
  webhook_url text,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE,
  owner text NOT NULL,
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  last_state text,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR webhook_url IS NOT NULL),
  UNIQUE (entry_id, owner)
);
CREATE INDEX tool_watches_entry_idx ON public.tool_watches(entry_id);
CREATE INDEX tool_watches_owner_idx ON public.tool_watches(owner);
GRANT ALL ON public.tool_watches TO service_role;
ALTER TABLE public.tool_watches ENABLE ROW LEVEL SECURITY;