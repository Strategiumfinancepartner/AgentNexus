UPDATE public.entries
SET status = 'rejected',
    review_note = 'Duplicate of an existing entry - kept a single canonical listing.',
    reviewed_at = now(),
    updated_at = now()
WHERE slug IN ('clearbit-logo-api','sequential-thinking-mcp-server','memory-mcp-server','fetch-mcp-server','playwright-mcp-server','filesystem-mcp-server');

INSERT INTO public.entries (
  slug, name, category, summary, description, auth_mode, endpoint, docs_url, probe_url,
  tags, capabilities, input_format, output_format, rate_limit, pricing,
  invocation_example, status, source
) VALUES (
  'checkly-api',
  'Checkly API',
  'api',
  'Run and manage browser tests and synthetic API monitors from an agent, with results, locations and runtimes exposed over REST.',
  'Checkly runs Playwright-based browser checks and API checks from 20+ locations and exposes everything over a REST API: create checks, trigger runs, read results, list runtimes and locations. The runtimes and locations endpoints answer without a key, the rest needs a personal API key plus account id headers. Useful for agents that need a second, independent browser-testing interface next to Playwright MCP and Browserless.',
  'api_key',
  'https://api.checklyhq.com/v1/runtimes',
  'https://developers.checklyhq.com/reference/getv1runtimes',
  'https://developers.checklyhq.com/',
  ARRAY['test','testing','browser','monitoring','automation','playwright'],
  ARRAY['run a browser test','run an api check','read test results','list check runtimes','synthetic monitoring'],
  'HTTP GET/POST with JSON body; Authorization: Bearer <api key> and X-Checkly-Account headers for account scoped routes',
  'JSON',
  'Documented at 1200 requests per minute per account; public reference routes (runtimes, locations) are unauthenticated but should not be polled aggressively.',
  'Free tier with 10k check runs per month, paid plans above.',
  'curl -s https://api.checklyhq.com/v1/runtimes',
  'approved',
  'curated'
);

UPDATE public.entries
SET tags = (SELECT ARRAY(SELECT DISTINCT unnest(tags || ARRAY['test','testing']))),
    capabilities = (SELECT ARRAY(SELECT DISTINCT unnest(capabilities || ARRAY['browser testing']))),
    updated_at = now()
WHERE slug IN ('browserless-api','browserbase-mcp','playwright-mcp');

UPDATE public.entries
SET tags = (SELECT ARRAY(SELECT DISTINCT unnest(tags || ARRAY['test']))),
    updated_at = now()
WHERE slug = 'mail-tm-api';