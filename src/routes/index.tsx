import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { registry, type Entry } from "@/lib/registry";

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

const FILTERS = ["all", "api", "mcp", "cli"] as const;

function Index() {
  const [filter, setFilter] = useState<"all" | Entry["category"]>("all");
  const items = registry.filter((e) => filter === "all" || e.category === filter);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ambient light */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: "var(--color-primary)" }}
      />

      <div className="relative mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <span className="flex items-center gap-2.5 font-mono text-xs tracking-[0.28em] uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus
          </span>
          <div className="flex items-center gap-4">
            <Link
              to="/explore"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Explore
            </Link>
            <Link
              to="/connect"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Connect
            </Link>

            <a
              href="/llms.txt"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              /llms.txt
            </a>
            <a
              href="/mcp"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              /mcp
            </a>
            <Link
              to="/auth"
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </div>
        </header>

        <main>
          <section className="pt-24 pb-20">
            <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
              The agentic web
            </p>
            <h1 className="mt-6 text-4xl leading-[1.1] font-medium tracking-tight text-balance sm:text-5xl">
              The next billion users of the internet
              <span className="text-muted-foreground"> won't be human.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground">
              Agents don't need landing pages — they need interfaces they can
              call. Agent Nexus catalogs that layer: APIs, MCP servers and CLIs.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/explore"
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Browse the registry
              </Link>
              <code className="inline-flex h-10 items-center rounded-full border border-border px-4 font-mono text-xs text-muted-foreground">
                GET /mcp
              </code>
            </div>
          </section>

          <section id="registry" className="scroll-mt-24 border-t border-border/60 py-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
                Registry
              </h2>
              <div className="flex gap-1 rounded-full border border-border p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 font-mono text-[11px] tracking-widest uppercase transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-8 space-y-2">
              {items.map((e) => (
                <li
                  key={e.slug}
                  className="group rounded-xl border border-transparent px-4 py-5 transition-colors hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="w-9 shrink-0 font-mono text-[10px] uppercase tracking-widest text-primary/80">
                      {e.category}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-sm font-medium">{e.name}</p>
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {e.tags[0]}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {e.summary}
                      </p>
                      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground/60 transition-colors group-hover:text-primary/70">
                        {e.endpoint}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border/60 py-14">
            <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              For agents
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              No scraping required. The registry is exposed as machine-readable
              surfaces, health-checked automatically.
            </p>
            <ul className="mt-6 space-y-2 font-mono text-[12px]">
              <li>
                <a href="/llms.txt" className="text-muted-foreground hover:text-foreground">
                  GET /llms.txt
                </a>
                <span className="text-muted-foreground/50"> — full catalog, plain text</span>
              </li>
              <li>
                <a
                  href="/api/public/registry"
                  className="text-muted-foreground hover:text-foreground"
                >
                  GET /api/public/registry?q=&amp;category=api|mcp|cli
                </a>
                <span className="text-muted-foreground/50"> — JSON search</span>
              </li>
              <li>
                <a
                  href="/api/public/registry/stripe-api"
                  className="text-muted-foreground hover:text-foreground"
                >
                  GET /api/public/registry/{"{slug}"}
                </a>
                <span className="text-muted-foreground/50"> — single entry</span>
              </li>
              <li>
                <a
                  href="/api/public/discover?need=send%20an%20email"
                  className="text-muted-foreground hover:text-foreground"
                >
                  GET /api/public/discover?need=…
                </a>
                <span className="text-muted-foreground/50">
                  {" "}
                  — need → callable interfaces
                </span>
              </li>
              <li>
                <a href="/mcp" className="text-muted-foreground hover:text-foreground">
                  POST /mcp
                </a>
                <span className="text-muted-foreground/50">
                  {" "}
                  — MCP: discover_capabilities, search_registry, get_entry, submit_entry,
                  vote_entry
                </span>
              </li>
            </ul>
          </section>
        </main>

        <footer className="flex items-center justify-between border-t border-border/60 py-8 font-mono text-[11px] text-muted-foreground">
          <span>{registry.length} callable surfaces indexed</span>
          <Link to="/pricing" className="transition-colors hover:text-foreground">
            pricing
          </Link>
        </footer>

      </div>
    </div>
  );
}
