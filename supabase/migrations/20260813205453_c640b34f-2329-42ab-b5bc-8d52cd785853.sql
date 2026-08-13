-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.entry_category AS ENUM ('api', 'mcp', 'cli');
CREATE TYPE public.entry_status AS ENUM ('pending', 'approved', 'rejected');

-- ============ SHARED TRIGGER FN ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- new user -> profile (+ admin role for the very first account)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ REGISTRY ENTRIES ============
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.entry_category NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  auth_mode TEXT NOT NULL DEFAULT 'none',
  endpoint TEXT NOT NULL,
  docs_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.entry_status NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  health_ok BOOLEAN,
  health_status_code INTEGER,
  health_latency_ms INTEGER,
  health_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entries_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT entries_name_len CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT entries_summary_len CHECK (char_length(summary) BETWEEN 10 AND 300),
  CONSTRAINT entries_description_len CHECK (char_length(description) <= 4000),
  CONSTRAINT entries_endpoint_len CHECK (char_length(endpoint) BETWEEN 1 AND 500),
  CONSTRAINT entries_tags_len CHECK (cardinality(tags) <= 8)
);
CREATE INDEX entries_status_idx ON public.entries (status);
CREATE INDEX entries_category_idx ON public.entries (category);
CREATE INDEX entries_submitted_by_idx ON public.entries (submitted_by);

GRANT SELECT, INSERT ON public.entries TO authenticated;
GRANT UPDATE, DELETE ON public.entries TO authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read approved entries" ON public.entries
  FOR SELECT TO authenticated USING (status = 'approved');
CREATE POLICY "Authors can read their own entries" ON public.entries
  FOR SELECT TO authenticated USING (auth.uid() = submitted_by);
CREATE POLICY "Admins can read every entry" ON public.entries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Signed-in users can submit entries" ON public.entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Admins can update entries" ON public.entries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete entries" ON public.entries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Non-admins can never set moderation/health fields themselves.
CREATE OR REPLACE FUNCTION public.enforce_entry_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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
$$;
CREATE TRIGGER entries_enforce_submission BEFORE INSERT ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_entry_submission();
CREATE TRIGGER entries_set_updated_at BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HEALTH CHECK HISTORY ============
CREATE TABLE public.health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  ok BOOLEAN NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX health_checks_entry_idx ON public.health_checks (entry_id, checked_at DESC);
GRANT SELECT ON public.health_checks TO authenticated;
GRANT ALL ON public.health_checks TO service_role;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read health of approved entries" ON public.health_checks
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.entries e WHERE e.id = entry_id AND e.status = 'approved')
  );

-- ============ SEED ============
INSERT INTO public.entries (slug, name, category, summary, auth_mode, endpoint, tags, status, docs_url) VALUES
('stripe-api','Stripe','api','Payments, subscriptions, invoices. Idempotent writes, cursor pagination.','Bearer secret key','https://api.stripe.com/v1',ARRAY['payments','billing'],'approved','https://docs.stripe.com/api'),
('notion-api','Notion','api','Pages, databases and blocks as structured JSON. Rate limit ~3 req/s.','Bearer integration token','https://api.notion.com/v1',ARRAY['docs','knowledge'],'approved','https://developers.notion.com'),
('resend-api','Resend','api','Transactional email with a single POST. Ideal for agent side effects.','Bearer API key','https://api.resend.com/emails',ARRAY['email'],'approved','https://resend.com/docs'),
('linear-api','Linear','api','GraphQL issue tracker. Strong schema, great for planning agents.','API key header','https://api.linear.app/graphql',ARRAY['issues','graphql'],'approved','https://developers.linear.app'),
('supabase-mcp','Supabase MCP','mcp','Query and mutate Postgres, inspect schema, manage projects over MCP.','OAuth 2.1 / PAT','https://mcp.supabase.com/mcp',ARRAY['database','sql'],'approved','https://supabase.com/docs'),
('github-mcp','GitHub MCP','mcp','Repos, issues, pull requests and code search as first-class tools.','OAuth 2.1','https://api.githubcopilot.com/mcp',ARRAY['code','vcs'],'approved','https://docs.github.com'),
('sentry-mcp','Sentry MCP','mcp','Error groups, stack traces and release health for debugging agents.','OAuth 2.1','https://mcp.sentry.dev/mcp',ARRAY['observability'],'approved','https://docs.sentry.io'),
('cloudflare-mcp','Cloudflare MCP','mcp','Workers, DNS, analytics and logs exposed as remote MCP tools.','OAuth 2.1','https://observability.mcp.cloudflare.com/mcp',ARRAY['edge','infra'],'approved','https://developers.cloudflare.com'),
('gh-cli','gh','cli','GitHub from the shell. gh pr create, gh issue list --json for parsing.','gh auth login','gh <command> --json',ARRAY['vcs','json-output'],'approved','https://cli.github.com/manual'),
('psql-cli','psql','cli','Direct SQL access. psql -c "..." --csv gives agent-parseable output.','connection string','psql $DATABASE_URL -c',ARRAY['database'],'approved','https://www.postgresql.org/docs/current/app-psql.html'),
('ffmpeg-cli','ffmpeg','cli','Media transcoding an agent can drive deterministically from a prompt.','none','ffmpeg -i in.mp4 out.webm',ARRAY['media'],'approved','https://ffmpeg.org/documentation.html'),
('curl-cli','curl','cli','The universal fallback when no SDK or MCP server exists yet.','per target','curl -sS -H ''Authorization: ...''',ARRAY['http'],'approved','https://curl.se/docs/manpage.html');