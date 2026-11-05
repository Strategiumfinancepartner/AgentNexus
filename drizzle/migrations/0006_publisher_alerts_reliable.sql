ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS data_ok boolean,
  ADD COLUMN IF NOT EXISTS data_detail text,
  ADD COLUMN IF NOT EXISTS data_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS down_since timestamptz;

ALTER TABLE public.tool_watches ADD COLUMN IF NOT EXISTS webhook_secret text;

CREATE TABLE public.entry_alert_settings (
  entry_id uuid PRIMARY KEY REFERENCES public.entries(id) ON DELETE CASCADE,
  alert_outage boolean NOT NULL DEFAULT true,
  alert_schema boolean NOT NULL DEFAULT true,
  alert_data boolean NOT NULL DEFAULT true,
  stale_hours integer NOT NULL DEFAULT 24,
  min_volume integer,
  email text,
  webhook_url text,
  webhook_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  last_state text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.entry_alert_settings TO service_role;
ALTER TABLE public.entry_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.watch_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  watch_id uuid,
  audience text NOT NULL DEFAULT 'watch',
  channel text NOT NULL,
  target text NOT NULL,
  secret text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.watch_deliveries TO service_role;
ALTER TABLE public.watch_deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX watch_deliveries_pending ON public.watch_deliveries (status, next_attempt_at);
CREATE INDEX watch_deliveries_entry ON public.watch_deliveries (entry_id, created_at DESC);

-- Move Nova's data-quality evidence out of the schema columns.
UPDATE public.entries SET data_detail = schema_detail, data_ok = schema_ok, data_checked_at = schema_checked_at,
  schema_ok = NULL, schema_detail = NULL, schema_checked_at = NULL
WHERE schema_detail LIKE '{"kind":"data-quality"%';