import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { categories, registry, type Entry } from "@/lib/registry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agent Nexus — Infrastructure for AI agents" },
      {
        name: "description",
        content:
          "A registry of the APIs, MCP servers and CLIs that AI agents call. The next billion internet users are agents — this is the layer they run on.",
      },
      { property: "og:title", content: "Agent Nexus — Infrastructure for AI agents" },
      {
        property: "og:description",
        content:
          "A registry of the APIs, MCP servers and CLIs that AI agents call. Machine-readable by design.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const catColor: Record<Entry["category"], string> = {
  api: "text-chart-2 border-chart-2/40 bg-chart-2/10",
  mcp: "text-primary border-primary/40 bg-primary/10",
  cli: "text-chart-3 border-chart-3/40 bg-chart-3/10",
};

function Index() {
  const [filter, setFilter] = useState<"all" | Entry["category"]>("all");
  const items = registry.filter((e) => filter === "all" || e.category === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:64px_64px]" />

      <header className="relative border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)]" />
            <span className="font-mono text-sm tracking-[0.2em] uppercase">Agent Nexus</span>
          </div>
          <a
            href="#registry"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            /registry
          </a>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-primary">
            Thesis 001
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl leading-[1.05] font-semibold tracking-tight sm:text-7xl">
            The next billion users
            <br />
            of the internet
            <span className="text-muted-foreground"> won't be human.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            They'll be agents. And agents don't need landing pages — they need
            interfaces they can call. The durable opportunity isn't another
            assistant; it's the infrastructure underneath: APIs, MCP servers and
            CLIs. Agent Nexus catalogs that layer, and exposes itself through it.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#registry"
              className="rounded-md bg-primary px-5 py-2.5 font-mono text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Browse the registry
            </a>
            <span className="rounded-md border border-border px-5 py-2.5 font-mono text-sm text-muted-foreground">
              MCP endpoint: /mcp
            </span>
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="bg-background p-8">
                <p className="font-mono text-xs tracking-[0.25em] uppercase text-muted-foreground">
                  {c.line}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{c.label}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {c.blurb}
                </p>
                <p className="mt-6 font-mono text-xs text-primary">
                  {registry.filter((e) => e.category === c.id).length} entries
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="registry" className="mx-auto max-w-6xl px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Registry</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Every entry is a callable surface, not a marketing page.
              </p>
            </div>
            <div className="flex gap-2 font-mono text-xs">
              {(["all", "api", "mcp", "cli"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md border px-3 py-1.5 uppercase tracking-widest transition-colors ${
                    filter === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <article
                key={e.slug}
                className="group bg-background p-6 transition-colors hover:bg-card"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight">{e.name}</h3>
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${catColor[e.category]}`}
                  >
                    {e.category}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {e.summary}
                </p>
                <div className="mt-5 space-y-1.5 font-mono text-[11px] text-muted-foreground">
                  <p className="truncate">
                    <span className="text-foreground/60">call </span>
                    {e.endpoint}
                  </p>
                  <p>
                    <span className="text-foreground/60">auth </span>
                    {e.auth}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-3xl font-semibold tracking-tight">
              Built to be called by machines
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The same registry a human reads here is exposed as MCP tools, so
              another agent can query it directly instead of scraping this page.
            </p>
            <pre className="mt-8 overflow-x-auto rounded-lg border border-border bg-card p-6 font-mono text-xs leading-relaxed text-muted-foreground">
{`# connect any MCP client
{
  "mcpServers": {
    "agent-nexus": { "url": "https://<your-domain>/mcp" }
  }
}

> search_registry({ query: "payments" })
> get_entry({ slug: "stripe-api" })`}
            </pre>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 font-mono text-xs text-muted-foreground">
          <span>Agent Nexus — infrastructure for the agentic web</span>
          <span>{registry.length} callable surfaces indexed</span>
        </div>
      </footer>
    </div>
  );
}
