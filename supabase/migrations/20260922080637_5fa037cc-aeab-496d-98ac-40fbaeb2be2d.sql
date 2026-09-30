ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS reports_count integer NOT NULL DEFAULT 0;

UPDATE public.entries e
SET reports_count = sub.n
FROM (SELECT entry_id, count(*)::int AS n FROM public.invocation_reports WHERE entry_id IS NOT NULL GROUP BY entry_id) sub
WHERE e.id = sub.entry_id;

CREATE OR REPLACE FUNCTION public.bump_entry_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_id IS NOT NULL THEN
    UPDATE public.entries SET reports_count = reports_count + 1 WHERE id = NEW.entry_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invocation_reports_bump ON public.invocation_reports;
CREATE TRIGGER invocation_reports_bump
AFTER INSERT ON public.invocation_reports
FOR EACH ROW EXECUTE FUNCTION public.bump_entry_reports();

CREATE TABLE IF NOT EXISTS public.report_credits (
  actor text NOT NULL,
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  reports integer NOT NULL DEFAULT 0,
  PRIMARY KEY (actor, day)
);

GRANT ALL ON public.report_credits TO service_role;
ALTER TABLE public.report_credits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.grant_report_credit(_actor text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  total integer;
BEGIN
  DELETE FROM public.report_credits WHERE day < today - 7;
  INSERT INTO public.report_credits (actor, day, reports)
  VALUES (left(_actor, 200), today, 1)
  ON CONFLICT (actor, day) DO UPDATE SET reports = public.report_credits.reports + 1
  RETURNING reports INTO total;
  RETURN coalesce(total, 1);
END;
$$;