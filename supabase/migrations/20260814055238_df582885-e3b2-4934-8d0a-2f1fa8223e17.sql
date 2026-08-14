CREATE OR REPLACE FUNCTION public.enforce_entry_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted server-side ingest (service role) keeps the curated values it sets.
  IF auth.uid() IS NULL AND current_setting('request.jwt.claims', true) IS NULL THEN
    NEW.slug := lower(NEW.slug);
    RETURN NEW;
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.review_note := NULL;
    NEW.health_ok := NULL;
    NEW.health_status_code := NULL;
    NEW.health_latency_ms := NULL;
    NEW.health_checked_at := NULL;
    NEW.verified := false;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.featured := false;
  END IF;
  NEW.checks_total := 0;
  NEW.checks_ok := 0;
  NEW.avg_latency_ms := NULL;
  NEW.slug := lower(NEW.slug);
  RETURN NEW;
END;
$$;

UPDATE public.entries
SET status = 'approved'
WHERE source = 'seed' AND status = 'pending';