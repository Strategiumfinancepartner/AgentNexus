CREATE TABLE public.publisher_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  kind text NOT NULL,
  recipient text NOT NULL DEFAULT '',
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_publisher_alerts_entry ON public.publisher_alerts(entry_id, sent_at DESC);

GRANT ALL ON public.publisher_alerts TO service_role;

ALTER TABLE public.publisher_alerts ENABLE ROW LEVEL SECURITY;