import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getPublicCatalog, type PublicEntry } from "@/lib/public-registry.functions";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore the Agent Nexus registry — APIs, MCP servers, CLIs" },
      {
        name: "description",
        content:
          "Browse every approved interface in the Agent Nexus registry: HTTP APIs, MCP servers and CLIs, with live health status and machine-readable endpoints.",
      },
      { property: "og:title", content: "Explore the Agent Nexus registry" },
      {
        property: "og:description",
        content:
          "Approved APIs, MCP servers and CLIs agents can call — with health checks, JSON API and llms.txt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getPublicCatalog(),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
      The registry is temporarily unavailable. Please retry in a moment.
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">Nothing here.</main>
  ),
  component: Explore,
});

const FILTERS = ["all", "api", "mcp", "cli"] as const;

/** Interfaces that are not remote HTTP endpoints can't be monitored — say why. */
function unmonitoredLabel(entry: PublicEntry) {
  if (entry.category === "cli") return "local cli";
  if (!/^https?:\/\//i.test(entry.endpoint)) return "local (stdio)";
  if (/[{<][^{}<>\s]+[}>]/.test(entry.endpoint)) return "templated url";
  return "awaiting probe";
}

function Health({ entry }: { entry: PublicEntry }) {
  const label =
    entry.health_ok === null
      ? unmonitoredLabel(entry)
      : entry.health_ok
        ? "operational"
        : "unreachable";
  const tone =
    entry.health_ok === null
      ? "text-muted-foreground"
      : entry.health_ok
        ? "text-primary"
        : "text-destructive";
  return (
    <span className={`font-mono text-[10px] tracking-widest uppercase ${tone}`}>
      {label}
      {entry.health_latency_ms != null && entry.health_ok ? ` · ${entry.health_latency_ms}ms` : ""}
    </span>
  );
}

function Explore() {
  const { entries, counts, health } = Route.useLoaderData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (filter === "all" || e.category === filter) &&
        (!term ||
          `${e.name} ${e.summary} ${e.endpoint} ${e.tags.join(" ")}`.toLowerCase().includes(term)),
    );
  }, [entries, filter, query]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-xs tracking-[0.28em] uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus
          </Link>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <a href="/llms.txt" className="transition-colors hover:text-foreground">
              /llms.txt
            </a>
            <a href="/mcp" className="transition-colors hover:text-foreground">
              /mcp
            </a>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-24">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">The registry</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            {counts.all} approved interfaces · {health.up} operational · {health.down} unreachable ·{" "}
            {health.unknown} unchecked. Same data over{" "}
            <a href="/api/public/registry" className="text-foreground underline underline-offset-4">
              JSON
            </a>
            ,{" "}
            <a href="/llms.txt" className="text-foreground underline underline-offset-4">
              llms.txt
            </a>{" "}
            and{" "}
            <a href="/mcp" className="text-foreground underline underline-offset-4">
              MCP
            </a>
            .
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-widest uppercase transition-colors ${
                  filter === f
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {f} {f === "all" ? counts.all : counts[f]}
              </button>
            ))}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search the registry"
              className="ml-auto h-8 w-44 rounded-full border border-border/60 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40"
            />
          </div>

          <ul className="mt-8 divide-y divide-border/60 border-t border-border/60">
            {items.map((entry) => (
              <li key={entry.slug} className="group py-5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{entry.name}</span>
                  <Health entry={entry} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{entry.summary}</p>
                <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground/70">
                  {entry.category} · {entry.endpoint} · auth: {entry.auth_mode}
                </p>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-10 text-sm text-muted-foreground">No interface matches.</li>
            )}
          </ul>
        </main>
      </div>
    </div>
  );
}
