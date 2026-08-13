-- 1. Rich, machine-actionable schema
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS capabilities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auth_params JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS input_format TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS output_format TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rate_limit TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pricing TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invocation_example TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checks_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checks_ok INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_latency_ms INTEGER;

CREATE INDEX IF NOT EXISTS entries_capabilities_idx ON public.entries USING GIN (capabilities);

-- 2. Reliability aggregates maintained by health checks
CREATE OR REPLACE FUNCTION public.apply_health_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.entries e
  SET checks_total = e.checks_total + 1,
      checks_ok = e.checks_ok + CASE WHEN NEW.ok THEN 1 ELSE 0 END,
      avg_latency_ms = CASE
        WHEN NEW.latency_ms IS NULL THEN e.avg_latency_ms
        WHEN e.avg_latency_ms IS NULL THEN NEW.latency_ms
        ELSE ((e.avg_latency_ms * 4) + NEW.latency_ms) / 5
      END
  WHERE e.id = NEW.entry_id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_health_check() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS health_checks_apply ON public.health_checks;
CREATE TRIGGER health_checks_apply AFTER INSERT ON public.health_checks
  FOR EACH ROW EXECUTE FUNCTION public.apply_health_check();

-- 3. Submissions can never self-declare verified/featured or reliability stats
CREATE OR REPLACE FUNCTION public.enforce_entry_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
$function$;

-- 4. Backfill capability metadata on the reference catalogue
UPDATE public.entries SET capabilities = ARRAY['payments','subscriptions','invoicing','refunds'], input_format='application/x-www-form-urlencoded', output_format='application/json', rate_limit='100 req/s', pricing='usage-based', invocation_example='curl https://api.stripe.com/v1/charges -u sk_test_xxx:' WHERE slug='stripe-api';
UPDATE public.entries SET capabilities = ARRAY['documents','knowledge-base','search','write-page'], input_format='application/json', output_format='application/json', rate_limit='3 req/s', pricing='free tier', invocation_example='curl -H "Authorization: Bearer $TOKEN" https://api.notion.com/v1/search' WHERE slug='notion-api';
UPDATE public.entries SET capabilities = ARRAY['send-email','transactional-email','notifications'], input_format='application/json', output_format='application/json', rate_limit='10 req/s', pricing='free tier then usage', invocation_example='curl -X POST https://api.resend.com/emails -H "Authorization: Bearer $KEY" -d ''{"to":"a@b.c"}''' WHERE slug='resend-api';
UPDATE public.entries SET capabilities = ARRAY['issue-tracking','project-planning','graphql-query'], input_format='application/json (GraphQL)', output_format='application/json', rate_limit='1500 req/h', pricing='free for teams', invocation_example='POST https://api.linear.app/graphql' WHERE slug='linear-api';
UPDATE public.entries SET capabilities = ARRAY['database-query','sql','schema-inspection'], input_format='MCP JSON-RPC', output_format='MCP content', pricing='free' WHERE slug='supabase-mcp';
UPDATE public.entries SET capabilities = ARRAY['code-search','repositories','pull-requests','issues'], input_format='MCP JSON-RPC', output_format='MCP content', pricing='included with GitHub' WHERE slug='github-mcp';

UPDATE public.entries
SET verified = true, verified_at = now()
WHERE status = 'approved' AND slug IN ('stripe-api','notion-api','resend-api','linear-api','supabase-mcp','github-mcp');