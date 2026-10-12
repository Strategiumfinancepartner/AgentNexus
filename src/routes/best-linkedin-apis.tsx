import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/best-linkedin-apis")({
  head: () => ({
    meta: [
      {
        title: "Best LinkedIn and B2B data APIs for agents, tested live — Agent Nexus (agentnexus.app)",
      },
      {
        name: "description",
        content:
          "A curated shortlist of LinkedIn data and B2B enrichment APIs for AI agents — profiles, companies, posts and firmographics — each one probed live by Agent Nexus before being listed, with auth requirements and pricing notes.",
      },
      {
        property: "og:title",
        content: "Best LinkedIn and B2B data APIs for agents, tested live — Agent Nexus",
      },
      {
        property: "og:description",
        content:
          "Profiles, companies, posts and enrichment: every B2B data API on this list answers a real probe before it is listed.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/best-linkedin-apis" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/best-linkedin-apis" }],
  }),
  component: BestLinkedinApis,
});

type Pick = { slug: string; name: string; why: string; auth: string };

const GROUPS: { title: string; note: string; picks: Pick[] }[] = [
  {
    title: "LinkedIn profiles, posts and companies",
    note: "When the agent needs actual LinkedIn data — a profile, a post, a company page.",
    picks: [
      {
        slug: "datacircle-mcp",
        name: "Datacircle",
        why: "A data co-op fronting three LinkedIn APIs (Up2Data, HarvestAPI, Fetchin) through one MCP server — same request shape, per-call pricing from $2.375/1k.",
        auth: "MCP + API key",
      },
      {
        slug: "scrapeatlas-mcp",
        name: "ScrapeAtlas",
        why: "Hosted MCP server for public social media data: profiles, posts, videos and comments.",
        auth: "MCP + API key",
      },
      {
        slug: "apify-mcp",
        name: "Apify MCP",
        why: "Runs thousands of ready-made scrapers as MCP tools, including many LinkedIn actors.",
        auth: "MCP + token",
      },
      {
        slug: "wrenda-api",
        name: "Wrenda",
        why: "B2B contact and profile enrichment over a simple REST contract.",
        auth: "API key",
      },
    ],
  },
  {
    title: "General-purpose web scraping",
    note: "When no dedicated API covers the page you need — crawl it yourself, politely.",
    picks: [
      {
        slug: "firecrawl-mcp",
        name: "Firecrawl MCP",
        why: "Web scraping, crawling and search as MCP tools; turns pages into clean markdown.",
        auth: "MCP + API key",
      },
    ],
  },
  {
    title: "Company data and firmographics",
    note: "Official registers and aggregated records — the reliable layer under enrichment.",
    picks: [
      {
        slug: "opencorporates-api",
        name: "OpenCorporates",
        why: "Company records aggregated from official registers worldwide.",
        auth: "API token",
      },
      {
        slug: "uk-companies-house-api",
        name: "UK Companies House",
        why: "The official UK register: company profiles, officers and filing history.",
        auth: "API key",
      },
      {
        slug: "katalis-uk-company-enrichment-api",
        name: "Katalis UK Company Enrichment",
        why: "Verified UK company profiles with an AI summary and accuracy score, built on Companies House data.",
        auth: "API key",
      },
      {
        slug: "sec-edgar-api",
        name: "SEC EDGAR",
        why: "Public filings and company financial facts for US-listed companies; no key required.",
        auth: "None",
      },
      {
        slug: "recherche-entreprises-api",
        name: "Recherche d'entreprises (data.gouv.fr)",
        why: "Open French company search by name, SIREN or address; no key required.",
        auth: "None",
      },
      {
        slug: "kontragentpro-api",
        name: "KontragentPro",
        why: "Russian company data from state registers by INN or OGRN: profile, finances, timeline.",
        auth: "API key",
      },
    ],
  },
  {
    title: "Keeping the data in a CRM",
    note: "Once the agent has enriched a lead, this is where it lands.",
    picks: [
      {
        slug: "hubspot-crm-api",
        name: "HubSpot CRM API",
        why: "Contacts, companies, deals and tickets — the default landing zone for enriched leads.",
        auth: "Bearer token",
      },
      {
        slug: "zoho-crm-api",
        name: "Zoho CRM",
        why: "Leads, contacts, deals and custom modules.",
        auth: "OAuth",
      },
    ],
  },
];

function BestLinkedinApis() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus.APP
          </Link>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <Link to="/explore" className="transition-colors hover:text-foreground">
              Registry
            </Link>
            <Link to="/status" className="transition-colors hover:text-foreground">
              Status
            </Link>
            <Link to="/connect" className="transition-colors hover:text-foreground">
              Connect
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-24">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            The best LinkedIn and B2B data APIs for agents — each one tested live
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            « linkedin profile », « enrich person », « b2b data api » are among the most common
            needs agents bring to our registry. Every service below answered a real probe before
            being listed — we re-probe them continuously, and current health is on each entry's
            page.
          </p>

          {GROUPS.map((group) => (
            <section key={group.title} className="mt-14">
              <h2 className="text-xl font-medium tracking-tight">{group.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{group.note}</p>
              <ul className="mt-5 divide-y divide-border/60 border-t border-border/60">
                {group.picks.map((pick) => (
                  <li key={pick.slug} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <Link
                        to="/registry/$slug"
                        params={{ slug: pick.slug }}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {pick.name}
                      </Link>
                      <span className="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                        {pick.auth}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{pick.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="mt-16 rounded-xl border border-border/60 p-5">
            <p className="text-sm text-muted-foreground">
              This shortlist is maintained by hand from the{" "}
              <Link to="/explore" className="text-foreground underline underline-offset-4">
                full registry
              </Link>{" "}
              — 700+ interfaces, each with live health, latency and an agent-readable contract.
              Agents can read the same list machine-first at{" "}
              <a href="/entries.ndjson" className="text-foreground underline underline-offset-4">
                /entries.ndjson
              </a>
              . Also see{" "}
              <Link to="/best-email-apis" className="text-foreground underline underline-offset-4">
                the best email APIs
              </Link>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
