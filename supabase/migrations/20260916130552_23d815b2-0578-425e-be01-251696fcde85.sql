ALTER TABLE public.entries ADD COLUMN IF NOT EXISTS probe_url text;

-- Fallback probe targets for templated / non-HTTP interfaces
UPDATE public.entries SET probe_url = v.url FROM (VALUES
  ('airtable-api','https://api.airtable.com/v0/meta/whoami'),
  ('algolia-search-api','https://status.algolia.com/'),
  ('clearbit-logo-api','https://logo.clearbit.com/stripe.com'),
  ('cloudflare-r2-s3-api','https://developers.cloudflare.com/r2/api/s3/api/'),
  ('elevenlabs-api','https://api.elevenlabs.io/v1/models'),
  ('google-calendar-api','https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'),
  ('pinecone-api','https://api.pinecone.io/indexes'),
  ('sec-edgar-api','https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json'),
  ('sentry-api','https://sentry.io/api/0/'),
  ('twilio-messaging-api','https://api.twilio.com/2010-04-01'),
  ('wikipedia-api','https://en.wikipedia.org/api/rest_v1/page/summary/Model_Context_Protocol'),
  ('fetch-mcp','https://registry.npmjs.org/mcp-server-fetch'),
  ('filesystem-mcp','https://registry.npmjs.org/@modelcontextprotocol/server-filesystem'),
  ('memory-mcp','https://registry.npmjs.org/@modelcontextprotocol/server-memory'),
  ('playwright-mcp','https://registry.npmjs.org/@playwright/mcp'),
  ('postgres-mcp-server','https://registry.npmjs.org/@modelcontextprotocol/server-postgres'),
  ('sequential-thinking-mcp','https://registry.npmjs.org/@modelcontextprotocol/server-sequential-thinking'),
  ('supabase-mcp-server','https://registry.npmjs.org/@supabase/mcp-server-supabase'),
  ('aws-cli','https://pypi.org/pypi/awscli/json'),
  ('curl-cli','https://curl.se/docs/manpage.html'),
  ('docker-cli','https://docs.docker.com/reference/cli/docker/'),
  ('duckdb-cli','https://duckdb.org/docs/stable/clients/cli/overview'),
  ('ffmpeg-cli','https://ffmpeg.org/documentation.html'),
  ('gh-cli','https://cli.github.com/manual'),
  ('git-cli','https://git-scm.com/docs/git'),
  ('imagemagick-cli','https://imagemagick.org/script/command-line-processing.php'),
  ('jq-cli','https://jqlang.github.io/jq/manual/'),
  ('openssl-cli','https://docs.openssl.org/master/man1/openssl/'),
  ('pandoc-cli','https://pandoc.org/MANUAL.html'),
  ('psql-cli','https://www.postgresql.org/docs/current/app-psql.html'),
  ('ripgrep-cli','https://github.com/BurntSushi/ripgrep')
) AS v(slug,url) WHERE public.entries.slug = v.slug;

-- Duplicate listings of the same MCP server: keep one canonical entry
UPDATE public.entries
SET status = 'rejected', review_note = 'Duplicate listing — canonical entry kept', updated_at = now()
WHERE slug IN ('fetch-mcp-server','filesystem-mcp-server','memory-mcp-server','playwright-mcp-server','sequential-thinking-mcp-server');

INSERT INTO public.entries (slug,name,category,summary,description,auth_mode,endpoint,docs_url,tags,capabilities,status,source,pricing,input_format,output_format,reviewed_at)
VALUES
('openalex-api','OpenAlex','api','Open catalog of scholarly works, authors and institutions, no key required.','Free REST API over 250M+ scholarly works. Useful for agents doing literature research and citation graphs.','none','https://api.openalex.org/works','https://docs.openalex.org/','{research,academic,open-data}','{search_works,get_author,list_institutions}','approved','curated','free','query params','json',now()),
('open-meteo-api','Open-Meteo','api','Free weather forecast and historical weather API without an API key.','Hourly and daily forecasts, historical reanalysis and air quality. No authentication, generous limits.','none','https://api.open-meteo.com/v1/forecast','https://open-meteo.com/en/docs','{weather,geo,open-data}','{forecast,historical_weather,air_quality}','approved','curated','free','query params','json',now()),
('frankfurter-api','Frankfurter','api','Foreign exchange rates published by the European Central Bank.','Latest and historical FX reference rates, currency conversion, no key required.','none','https://api.frankfurter.app/latest','https://frankfurter.dev/','{finance,fx,open-data}','{latest_rates,historical_rates,convert}','approved','curated','free','query params','json',now()),
('nominatim-osm-api','Nominatim (OpenStreetMap)','api','Geocoding and reverse geocoding on OpenStreetMap data.','Address to coordinates and back. Requires a descriptive user agent and respects a 1 request/second policy.','none','https://nominatim.openstreetmap.org/search','https://nominatim.org/release-docs/latest/api/Search/','{geo,geocoding,open-data}','{geocode,reverse_geocode}','approved','curated','free · 1 req/s','query params','json',now()),
('hn-algolia-api','Hacker News Search','api','Full-text search over Hacker News stories and comments.','Algolia-powered HN search API. Good source of fresh technical signal for agents.','none','https://hn.algolia.com/api/v1/search','https://hn.algolia.com/api','{search,news,open-data}','{search_stories,search_comments,front_page}','approved','curated','free','query params','json',now()),
('free-dictionary-api','Free Dictionary API','api','English definitions, phonetics and synonyms for a word.','Simple lexical lookup endpoint, no authentication.','none','https://api.dictionaryapi.dev/api/v2/entries/en/hello','https://dictionaryapi.dev/','{language,nlp,open-data}','{define_word,phonetics,synonyms}','approved','curated','free','path param','json',now()),
('ipapi-geolocation-api','ipapi.co','api','IP geolocation: country, city, timezone and ASN for an IP address.','Free tier for low volume, key for higher throughput. Useful for agent request enrichment.','optional key','https://ipapi.co/json/','https://ipapi.co/api/','{geo,network,enrichment}','{lookup_ip,timezone,asn}','approved','curated','freemium','query params','json',now()),
('worldbank-api','World Bank Open Data','api','Country-level economic and development indicators.','Thousands of indicators (GDP, population, energy) as JSON or XML, no key.','none','https://api.worldbank.org/v2/country?format=json','https://datahelpdesk.worldbank.org/knowledgebase/topics/125589','{economics,open-data,statistics}','{list_countries,get_indicator,time_series}','approved','curated','free','query params','json',now()),
('crossref-api','Crossref','api','Metadata for scholarly publications, DOIs and citations.','Search and resolve DOIs, retrieve references and funding metadata.','none','https://api.crossref.org/works','https://api.crossref.org/swagger-ui/index.html','{research,doi,open-data}','{search_works,resolve_doi,list_journals}','approved','curated','free','query params','json',now()),
('pubmed-eutils-api','PubMed E-utilities','api','Search and fetch biomedical literature from PubMed.','NCBI E-utilities for esearch/efetch/esummary across biomedical databases.','optional key','https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=agents&retmode=json','https://www.ncbi.nlm.nih.gov/books/NBK25501/','{research,biomedical,open-data}','{search_articles,fetch_abstract,summary}','approved','curated','free','query params','json',now()),
('openfoodfacts-api','Open Food Facts','api','Product, ingredient and nutrition data for packaged food.','Open database searchable by barcode, brand or category.','none','https://world.openfoodfacts.org/api/v2/search','https://openfoodfacts.github.io/openfoodfacts-server/api/','{food,products,open-data}','{search_products,get_by_barcode,nutrition_facts}','approved','curated','free','query params','json',now()),
('coingecko-api','CoinGecko','api','Crypto asset prices, market caps and historical charts.','Public demo tier plus keyed plans. Widely used price oracle for agents.','optional key','https://api.coingecko.com/api/v3/simple/price','https://docs.coingecko.com/reference/introduction','{crypto,finance,markets}','{simple_price,market_chart,list_coins}','approved','curated','freemium','query params','json',now()),
('brave-search-api','Brave Search API','api','Independent web search index with news and image endpoints.','Key-based web search built on Brave''s own index, common backend for agent search tools.','api key header','https://api.search.brave.com/res/v1/web/search','https://api-dashboard.search.brave.com/app/documentation','{search,web,retrieval}','{web_search,news_search,image_search}','approved','curated','freemium','query params','json',now()),
('firecrawl-api','Firecrawl','api','Turn any website into clean markdown or structured data for LLMs.','Scrape, crawl and extract endpoints designed for agent ingestion pipelines.','bearer token','https://api.firecrawl.dev/v1/scrape','https://docs.firecrawl.dev/api-reference/introduction','{scraping,crawling,retrieval}','{scrape_url,crawl_site,extract_schema}','approved','curated','freemium','json body','json',now()),
('tavily-search-api','Tavily Search','api','Search API tuned for LLM agents, returns answer-ready snippets.','Search and extract endpoints with built-in ranking for retrieval-augmented generation.','api key','https://api.tavily.com/search','https://docs.tavily.com/documentation/api-reference/endpoint/search','{search,rag,retrieval}','{search,extract,answer}','approved','curated','freemium','json body','json',now()),
('exa-search-api','Exa','api','Neural search over the web with content retrieval.','Embedding-based search plus contents and similarity endpoints for agent research.','api key','https://api.exa.ai/search','https://docs.exa.ai/reference/search','{search,neural,retrieval}','{search,get_contents,find_similar}','approved','curated','freemium','json body','json',now()),
('deepwiki-mcp','DeepWiki MCP','mcp','Remote MCP server that answers questions about any public GitHub repository.','Streamable HTTP MCP endpoint, no authentication, ideal for code-aware agents.','none','https://mcp.deepwiki.com/mcp','https://docs.devin.ai/work-with-devin/deepwiki-mcp','{code,docs,remote-mcp}','{read_wiki_structure,read_wiki_contents,ask_question}','approved','curated','free','json-rpc','json-rpc',now()),
('huggingface-mcp','Hugging Face MCP','mcp','Search models, datasets, spaces and papers on Hugging Face over MCP.','Official remote MCP endpoint; anonymous browsing plus authenticated actions with a token.','optional bearer','https://huggingface.co/mcp','https://huggingface.co/settings/mcp','{ml,models,remote-mcp}','{model_search,dataset_search,paper_search,space_search}','approved','curated','free','json-rpc','json-rpc',now()),
('context7-mcp','Context7 MCP','mcp','Up-to-date library documentation for coding agents over MCP.','Resolves package names to versioned docs and returns focused snippets.','optional api key','https://mcp.context7.com/mcp','https://context7.com/','{docs,code,remote-mcp}','{resolve_library_id,get_library_docs}','approved','curated','freemium','json-rpc','json-rpc',now()),
('sentry-mcp','Sentry MCP','mcp','Query Sentry issues, events and releases from an agent.','Official hosted MCP server with OAuth; lets agents triage production errors.','oauth','https://mcp.sentry.dev/mcp','https://docs.sentry.io/product/sentry-mcp/','{observability,errors,remote-mcp}','{find_issues,get_issue_details,search_events}','approved','curated','included with Sentry','json-rpc','json-rpc',now()),
('github-mcp-remote','GitHub MCP (remote)','mcp','Official GitHub remote MCP server for repos, issues and pull requests.','Hosted endpoint with OAuth or PAT; the reference integration for coding agents.','oauth or pat','https://api.githubcopilot.com/mcp/','https://github.com/github/github-mcp-server','{code,git,remote-mcp}','{search_code,create_issue,list_pull_requests,get_file_contents}','approved','curated','free','json-rpc','json-rpc',now()),
('stripe-mcp','Stripe MCP','mcp','Manage Stripe customers, products and payments over MCP.','Official hosted MCP server; also exposes Stripe documentation search.','oauth or api key','https://mcp.stripe.com','https://docs.stripe.com/mcp','{payments,billing,remote-mcp}','{search_documentation,list_customers,create_payment_link}','approved','curated','included with Stripe','json-rpc','json-rpc',now()),
('linear-mcp','Linear MCP','mcp','Create and query Linear issues, projects and cycles from an agent.','Official remote MCP server with OAuth authorization.','oauth','https://mcp.linear.app/mcp','https://linear.app/docs/mcp','{productivity,issues,remote-mcp}','{list_issues,create_issue,update_issue,list_projects}','approved','curated','included with Linear','json-rpc','json-rpc',now()),
('notion-mcp','Notion MCP','mcp','Search and edit Notion pages and databases over MCP.','Official hosted MCP server with OAuth; used for agent knowledge bases.','oauth','https://mcp.notion.com/mcp','https://developers.notion.com/docs/mcp','{productivity,knowledge,remote-mcp}','{search,fetch_page,create_page,update_page}','approved','curated','included with Notion','json-rpc','json-rpc',now()),
('cloudflare-docs-mcp','Cloudflare Docs MCP','mcp','Search Cloudflare developer documentation over MCP.','One of Cloudflare''s public remote MCP servers, no authentication needed.','none','https://docs.mcp.cloudflare.com/mcp','https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/','{docs,cloud,remote-mcp}','{search_cloudflare_documentation,migrate_pages_to_workers_guide}','approved','curated','free','json-rpc','json-rpc',now()),
('uv-cli','uv','cli','Fast Python package and project manager, runs tools with uvx.','Single binary replacing pip/venv/pipx. Agents use `uvx` to run Python MCP servers without installing.','local','uv','https://docs.astral.sh/uv/','{python,packaging,tooling}','{install_package,run_tool,sync_project}','approved','curated','free · open source','argv','stdout',now()),
('bun-cli','bun','cli','JavaScript runtime, bundler and package manager in one binary.','Runs TypeScript directly and installs packages fast — common host for JS MCP servers.','local','bun','https://bun.sh/docs/cli/run','{javascript,runtime,tooling}','{run_script,install_packages,execute_typescript}','approved','curated','free · open source','argv','stdout',now()),
('yt-dlp-cli','yt-dlp','cli','Download and extract metadata from video and audio sites.','Widely used media fetcher with JSON metadata output, scriptable by agents.','local','yt-dlp -J <url>','https://github.com/yt-dlp/yt-dlp#usage-and-options','{media,video,tooling}','{download_media,extract_metadata,list_formats}','approved','curated','free · open source','argv','json / files',now())
ON CONFLICT (slug) DO NOTHING;

UPDATE public.entries SET probe_url = 'https://pypi.org/pypi/uv/json' WHERE slug = 'uv-cli';
UPDATE public.entries SET probe_url = 'https://registry.npmjs.org/bun' WHERE slug = 'bun-cli';
UPDATE public.entries SET probe_url = 'https://pypi.org/pypi/yt-dlp/json' WHERE slug = 'yt-dlp-cli';