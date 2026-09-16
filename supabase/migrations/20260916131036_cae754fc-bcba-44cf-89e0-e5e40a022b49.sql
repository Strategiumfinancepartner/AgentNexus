UPDATE public.entries
SET status = 'rejected', review_note = 'Service discontinued by provider (domain no longer resolves)', updated_at = now()
WHERE slug = 'clearbit-logo-api';

UPDATE public.entries SET probe_url = v.url FROM (VALUES
  ('supabase-cli','https://registry.npmjs.org/supabase'),
  ('tesseract-cli','https://github.com/tesseract-ocr/tesseract'),
  ('sqlite3-cli','https://sqlite.org/cli.html')
) AS v(slug,url) WHERE public.entries.slug = v.slug;