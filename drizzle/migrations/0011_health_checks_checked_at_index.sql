-- Reversible: DROP INDEX IF EXISTS public.health_checks_checked_at_idx;
CREATE INDEX IF NOT EXISTS health_checks_checked_at_idx ON public.health_checks (checked_at);