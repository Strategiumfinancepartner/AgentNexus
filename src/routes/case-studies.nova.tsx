import { createFileRoute, Link } from "@tanstack/react-router";

const TITLE = "Case study: high-freshness job discovery for AI agents with Remote Jobs API (Nova)";
const DESC =
  "A 14-day Agent Nexus health and data-freshness pilot with Remote Jobs API: 1.01M to 1.46M live listings, 32 to 82 sources, all reporting source_last_updated, 100% probe reliability.";

export const Route = createFileRoute("/case-studies/nova")({
  head: () => ({
    meta: [
      { title: `${TITLE} — Agent Nexus` },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://agentnexus.app/case-studies/nova" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/case-studies/nova" }],
  }),
  component: NovaCaseStudy,
});

function NovaCaseStudy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-foreground">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">Case study · November 2026</p>
      <h1 className="mt-2 text-3xl font-semibold">{TITLE}</h1>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["1.46M", "live listings (from 1.01M)"],
          ["82", "sources (from 32)"],
          ["82/82", "report source_last_updated"],
          ["100%", "probe reliability"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-lg border border-border p-4">
            <div className="text-2xl font-semibold">{v}</div>
            <div className="text-sm text-muted-foreground">{l}</div>
          </div>
        ))}
      </section>

      <h2 className="mt-10 text-xl font-semibold">Challenge</h2>
      <p className="mt-2 text-muted-foreground">
        Aggregating over 1.4 million remote jobs across dozens of distributed platforms requires real-time
        proof that data is not only accessible, but continuously fresh. AI agents performing automated job
        matching drop providers that return stale records or silent empty responses.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Solution</h2>
      <p className="mt-2 text-muted-foreground">
        Agent Nexus partnered with Remote Jobs API for a 14-day continuous health probe pilot (October 21 –
        November 4, 2026). Running hourly multi-layer checks (HTTP liveness, schema validation and catalog
        volume verification), Agent Nexus monitored the endpoint as the catalog scaled from 1.01M to over
        1.45M listings and from 32 to 82 active sources.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Outcome</h2>
      <p className="mt-2 text-muted-foreground">
        During the pilot, Remote Jobs API introduced granular source_last_updated timestamps across all 82
        sources, enabling autonomous agents to verify source-level freshness in well under a second without
        consuming discovery tokens. The endpoint maintained 100% probe reliability throughout the period,
        establishing Remote Jobs API as a high-trust reference for AI agents across the ecosystem.
      </p>

      <p className="mt-8 text-sm text-muted-foreground">
        Reviewed and approved for publication by Nova (Remote Jobs API). Verify it yourself:{" "}
        <a className="underline" href="https://agentnexus.app/api/public/health-card/remote-jobs-api-api-nfpe">
          live health card
        </a>{" "}
        ·{" "}
        <a className="underline" href="https://remote-jobs-api.tten.no/health">
          Remote Jobs API /health
        </a>
      </p>

      <p className="mt-10">
        <Link to="/pricing" className="underline">
          Want this level of evidence for your own API or MCP server? See the Publisher plan.
        </Link>
      </p>
    </main>
  );
}
