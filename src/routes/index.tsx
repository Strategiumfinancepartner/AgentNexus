import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyCallout } from "@/components/key-callout";
import { useState } from "react";
import { registry, type Entry } from "@/lib/registry";
import { handleAnonymousMcpPost } from "@/lib/mcp/anonymous.server";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      POST: async ({ request }) => handleAnonymousMcpPost(request),
    },
  },
  head: () => ({
    meta: [
      { title: "Agent Nexus (agentnexus.app) — Infrastructure for AI agents" },
      {
        name: "description",
        content:
          "A registry of the APIs, MCP servers and CLIs that AI agents call. The next billion internet users are agents — this is the layer they run on.",
      },
      { property: "og:title", content: "Agent Nexus (agentnexus.app) — Infrastructure for AI agents" },
      {
        property: "og:description",
        content:
          "A registry of the APIs, MCP servers and CLIs that AI agents call. Machine-readable by design.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/" }],
  }),
  component: Index,
});

const FILTERS = ["all", "api", "mcp", "cli"] as const;

const NAV_LINKS: { label: string; to: string; external?: boolean }[] = [
  { label: "Explore", to: "/explore" },
  { label: "Connect", to: "/connect" },
  { label: "Status", to: "/status" },
  { label: "/llms.txt", to: "/llms.txt", external: true },
  { label: "/mcp", to: "/mcp", external: true },
  { label: "Sign in", to: "/auth" },
];

function Index() {
  const [filter, setFilter] = useState<"all" | Entry["category"]>("all");
  const [menuOpen, setMenuOpen] = useState(false);
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
        <header className="sticky top-0 z-10 -mx-6 border-b border-border/60 bg-background/70 px-6 py-4 backdrop-blur-xl sm:py-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <span className="flex min-w-0 items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase">
              <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="truncate">Agent Nexus.APP</span>
            </span>
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <Link
                to="/pricing"
                className="rounded-full bg-primary px-2.5 py-1 font-mono text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Pricing
              </Link>
              <div className="hidden items-center gap-4 sm:flex">
                {NAV_LINKS.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.to}
                      className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label="Menu"
                className="-mr-1 inline-flex size-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground sm:hidden"
              >
                <span className="relative block h-2.5 w-4">
                  <span className="absolute inset-x-0 top-0 h-px bg-current" />
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-x-0 bottom-0 h-px bg-current" />
                </span>
              </button>
            </div>
          </div>
          {menuOpen && (
            <nav className="mt-4 grid gap-1 border-t border-border/60 pt-3 sm:hidden">
              {NAV_LINKS.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.to}
                    className="rounded-lg px-1 py-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-1 py-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          )}
        </header>

        <main>
          <section className="pt-14 pb-14 sm:pt-24 sm:pb-20">
            <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
              The agentic web
            </p>
            <h1 className="mt-6 text-4xl leading-[1.1] font-medium tracking-tight text-balance sm:text-5xl">
              The next billion users of the internet
              <span className="text-muted-foreground"> won't be human.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground">
              Agents don't need landing pages — they need interfaces they can
              call. Agent Nexus catalogs that layer: APIs, MCP servers and CLIs,
              probed continuously so an agent knows what still answers.
            </p>
            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/connect"
                className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Connect an agent
              </Link>
              <Link
                to="/explore"
                className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Browse the registry
              </Link>
            </div>
            <div className="mt-8 overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-muted-foreground">
                No account needed
              </p>
              <pre className="mt-2 font-mono text-xs leading-relaxed text-foreground/90">
                <code>{'curl "/api/public/discover?need=send+a+transactional+email"'}</code>
              </pre>
            </div>
          </section>

          <section className="border-t border-border/60 py-10">
            <KeyCallout />
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

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 py-8 font-mono text-[11px] text-muted-foreground">
          <span>Callable surfaces indexed</span>
          <nav className="flex flex-wrap items-center gap-5">
            <Link to="/pricing" className="transition-colors hover:text-foreground">
              pricing
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              terms
            </Link>
            <Link to="/refunds" className="transition-colors hover:text-foreground">
              refunds
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              privacy
            </Link>
            <a
              href="https://live-vps.sasame.online/observatory/check/?url=https%3A%2F%2Fagentnexus.app%2Fmcp"
              target="_blank"
              rel="noopener noreferrer"
              title="SaSame MCP Readiness — public observation record for agentnexus.app/mcp"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              SaSame MCP Readiness
            </a>
          </nav>
        </footer>

      </div>
    </div>
  );
}
