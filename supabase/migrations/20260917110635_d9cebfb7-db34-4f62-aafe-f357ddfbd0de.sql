UPDATE entries SET invocation_example = v.ex, updated_at = now() FROM (VALUES
 ('crossref-api', 'curl -s "https://api.crossref.org/works?query=model+context+protocol&rows=1"'),
 ('free-dictionary-api', 'curl -s "https://api.dictionaryapi.dev/api/v2/entries/en/agent"'),
 ('hn-algolia-api', 'curl -s "https://hn.algolia.com/api/v1/search?query=mcp&hitsPerPage=1"'),
 ('nominatim-osm-api', 'curl -s -H "User-Agent: my-agent/1.0 (contact@example.com)" "https://nominatim.openstreetmap.org/search?q=Eiffel+Tower&format=json&limit=1"'),
 ('open-meteo-api', 'curl -s "https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m"'),
 ('openfoodfacts-api', 'curl -s -H "User-Agent: my-agent/1.0" "https://world.openfoodfacts.org/api/v2/search?categories_tags_en=Chocolates&fields=product_name&page_size=1"'),
 ('worldbank-api', 'curl -s "https://api.worldbank.org/v2/country/fr?format=json"'),
 ('hackernews-api', 'curl -s "https://hacker-news.firebaseio.com/v0/topstories.json"'),
 ('wikipedia-rest-api', 'curl -s "https://en.wikipedia.org/api/rest_v1/page/summary/Model_Context_Protocol"'),
 ('wikipedia-api', 'curl -s "https://en.wikipedia.org/api/rest_v1/page/summary/Model_Context_Protocol"'),
 ('openalex-api', 'curl -s "https://api.openalex.org/works?search=model+context+protocol&per-page=1&mailto=you@example.com"'),
 ('coingecko-api', 'curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"'),
 ('frankfurter-fx-api', 'curl -s "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD"'),
 ('sec-edgar-api', 'curl -s -H "User-Agent: my-agent/1.0 contact@example.com" "https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json"')
) AS v(slug, ex) WHERE entries.slug = v.slug;

UPDATE entries SET endpoint = 'https://api.frankfurter.dev/v1/latest' WHERE slug = 'frankfurter-fx-api';

UPDATE entries SET auth_mode = 'access_key query parameter (free tier)' WHERE slug = 'exchangerate-api';