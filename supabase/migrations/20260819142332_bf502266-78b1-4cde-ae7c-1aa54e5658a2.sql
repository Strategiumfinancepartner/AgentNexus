CREATE OR REPLACE FUNCTION public.enforce_entry_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  is_system boolean;
BEGIN
  -- Trusted server-side ingest: no end user, or an explicit service-role token.
  is_system := (auth.uid() IS NULL AND (jwt_role = '' OR jwt_role = 'service_role'));

  IF is_system THEN
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

  -- Reliability counters are owned by the probe pipeline: reset them only when
  -- a human creates the row, never on a later edit.
  IF TG_OP = 'INSERT' THEN
    NEW.checks_total := 0;
    NEW.checks_ok := 0;
    NEW.avg_latency_ms := NULL;
  ELSE
    NEW.checks_total := OLD.checks_total;
    NEW.checks_ok := OLD.checks_ok;
    NEW.avg_latency_ms := OLD.avg_latency_ms;
  END IF;

  NEW.slug := lower(NEW.slug);
  RETURN NEW;
END;
$$;

-- Repair the rows the previous version pushed back to pending.
UPDATE public.entries SET status = 'approved' WHERE source = 'seed' AND status = 'pending';