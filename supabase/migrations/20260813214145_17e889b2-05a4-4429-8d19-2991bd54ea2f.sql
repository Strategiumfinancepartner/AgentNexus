-- 1. Votes
CREATE TABLE public.entry_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.entry_votes TO authenticated;
GRANT SELECT ON public.entry_votes TO anon;
GRANT ALL ON public.entry_votes TO service_role;

ALTER TABLE public.entry_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes on approved entries"
ON public.entry_votes FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_id AND e.status = 'approved'));

CREATE POLICY "Signed-in users can read votes"
ON public.entry_votes FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_id AND e.status = 'approved')
);

CREATE POLICY "Signed-in users can vote"
ON public.entry_votes FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_id AND e.status = 'approved')
);

CREATE POLICY "Users can remove their own vote"
ON public.entry_votes FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX entry_votes_entry_id_idx ON public.entry_votes(entry_id);

-- 2. Public vote counts view
CREATE VIEW public.entry_vote_counts
WITH (security_invoker = true) AS
SELECT e.id AS entry_id, e.slug, count(v.id)::int AS votes
FROM public.entries e
LEFT JOIN public.entry_votes v ON v.entry_id = e.id
WHERE e.status = 'approved'
GROUP BY e.id, e.slug;

GRANT SELECT ON public.entry_vote_counts TO anon, authenticated;
GRANT ALL ON public.entry_vote_counts TO service_role;

-- 3. Moderators can review entries
CREATE POLICY "Moderators can read every entry"
ON public.entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update entries"
ON public.entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- moderators must not be reset to pending by the submission trigger
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
  END IF;
  NEW.slug := lower(NEW.slug);
  RETURN NEW;
END;
$function$;

-- 4. Reputation
CREATE OR REPLACE FUNCTION public.get_reputation(_user_id uuid)
RETURNS TABLE (approved_entries int, votes_received int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT count(*)::int FROM public.entries e
      WHERE e.submitted_by = _user_id AND e.status = 'approved'),
    (SELECT count(*)::int FROM public.entry_votes v
      JOIN public.entries e ON e.id = v.entry_id
      WHERE e.submitted_by = _user_id AND e.status = 'approved');
$function$;

REVOKE ALL ON FUNCTION public.get_reputation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reputation(uuid) TO authenticated, service_role;