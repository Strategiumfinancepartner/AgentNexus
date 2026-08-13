UPDATE public.entries
SET status = 'approved', reviewed_at = now(), review_note = 'Seeded reference entry'
WHERE status = 'pending'
  AND submitted_by IS NULL
  AND slug IN ('stripe-api','notion-api','resend-api','linear-api','supabase-mcp','github-mcp','sentry-mcp','cloudflare-mcp','gh-cli','psql-cli','ffmpeg-cli','curl-cli');