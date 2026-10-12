import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getStatus } from "@/lib/status.functions";
import { formatPercent } from "@/lib/uptime-core";

export const Route = createFileRoute("/is-down")({
  head: () => ({
    meta: [
      { title: "Is it down? Live status for 700+ APIs and MCP servers — Agent Nexus" },
      {
        name: "description",
        content:
          "Pick a service and get a straight answer: is it down right now? Every API, MCP server and CLI in the Agent Nexus registry is probed continuously — live status, 30-day uptime and latency, no account needed.",
      },
      { property: "og:title", content: "Is it down? Live status for 700+ APIs and MCP servers" },
      {
        property: "og:description",
        content:
          "Real probes, not user reports: live status, 30-day uptime and latency for every interface in the Agent Nexus registry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/is-down" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/is-down" }],
  }),
  loader: () => getStatus(),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
      The live status data is temporarily unavailable. Please retry in a moment.
    </main>
  ),
  component: IsDownIndex,
});

function IsDownIndex() {
  const { entries } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries
      .filter((e) => e.days.some((d) => d.checks > 0))
      .filter((e) => !term || `${e.name} ${e.slug}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, query]);

  const down = items.filter((e) => e.health_ok === false);

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
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Is it down?</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Pick a service, get a straight answer. Unlike crowd-reported outage sites, every
            answer here comes from a real probe we ran ourselves — the same checks agents read
            before calling these interfaces.
          </p>

          {down.length > 0 && (
            <section className="mt-8 rounded-xl border border-destructive/40 p-5">
              <h2 className="font-mono text-[11px] tracking-widest text-destructive uppercase">
                Failing right now
              </h2>
              <ul className="mt-3 space-y-2">
                {down.map((e) => (
                  <li key={e.slug}>
                    <Link
                      to="/is-down/$slug"
                      params={{ slug: e.slug }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {e.name}
                    </Link>{" "}
                    <span className="text-sm text-muted-foreground">
                      — last probe failed
                      {e.health_checked_at
                        ? ` at ${new Date(e.health_checked_at).toISOString().slice(0, 16).replace("T", " ")}Z`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10 flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a service…"
              aria-label="Search a service"
              className="h-9 w-full max-w-xs rounded-full border border-border/60 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40"
            />
            <span className="font-mono text-[11px] text-muted-foreground">{items.length} monitored</span>
          </div>

          <ul className="mt-6 divide-y divide-border/60 border-t border-border/60">
            {items.map((e) => (
              <li key={e.slug} className="flex items-baseline justify-between gap-4 py-3">
                <Link
                  to="/is-down/$slug"
                  params={{ slug: e.slug }}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {e.name}
                </Link>
                <span className="shrink-0 font-mono text-[11px] tracking-widest uppercase">
                  {e.health_ok === true ? (
                    <span className="text-primary">up</span>
                  ) : e.health_ok === false ? (
                    <span className="text-destructive">down</span>
                  ) : (
                    <span className="text-muted-foreground">unprobed</span>
                  )}
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatPercent(e.window_uptime)}
                    {e.avg_latency_ms ? ` · ${e.avg_latency_ms}ms` : ""}
                  </span>
                </span>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-10 text-sm text-muted-foreground">No monitored service matches.</li>
            )}
          </ul>
        </main>
      </div>
    </div>
  );
}
