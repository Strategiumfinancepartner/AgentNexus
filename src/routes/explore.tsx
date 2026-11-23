import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getPublicCatalog, type PublicEntry } from "@/lib/public-registry.functions";
import { KeyCallout } from "@/components/key-callout";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore the Agent Nexus registry (agentnexus.app) — APIs, MCP servers, CLIs" },
      {
        name: "description",
        content:
          "Browse every approved interface in the Agent Nexus registry: HTTP APIs, MCP servers and CLIs, with live health status and machine-readable endpoints.",
      },
      { property: "og:title", content: "Explore the Agent Nexus registry — agentnexus.app" },
      {
        property: "og:description",
        content:
          "Approved APIs, MCP servers and CLIs agents can call — with health checks, JSON API and llms.txt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/explore" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/explore" }],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string; from?: string; cat?: string; ref?: string } => {
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined);
    const out: { q?: string; from?: string; cat?: string; ref?: string } = {};
    const q = str(search["q"]), from = str(search["from"]), cat = str(search["cat"]), ref = str(search["ref"]);
    if (q) out.q = q;
    if (from) out.from = from;
    if (cat) out.cat = cat;
    if (ref) out.ref = ref;
    return out;
  },
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

/** True when the probe hit the entry's own endpoint, not a curated reference. */
function directlyProbed(entry: PublicEntry) {
  return /^https?:\/\//i.test(entry.endpoint) && !/[{<][^{}<>\s]+[}>]/.test(entry.endpoint);
}

function Health({ entry }: { entry: PublicEntry }) {
  const label =
    entry.health_ok === null
      ? unmonitoredLabel(entry)
      : entry.health_ok
        ? directlyProbed(entry)
          ? "operational"
          : "reference verified"
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
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.q ?? "");
  const alt = search.ref === "entry_cta_alt" && !!search.from;
  const sourceName = alt ? entries.find((e) => e.slug === search.from)?.name : undefined;

  const { items, widened } = useMemo(() => {
    const term = query.trim().toLowerCase();
    const pool = entries.filter((e) => !alt || e.slug !== search.from);
    const matched = pool.filter(
      (e) =>
        (filter === "all" || e.category === filter) &&
        (!term ||
          `${e.name} ${e.summary} ${e.endpoint} ${e.tags.join(" ")}`.toLowerCase().includes(term)),
    );
    // Alternatives must never land on an empty page: widen to the same kind of interface.
    if (alt && matched.length === 0 && term === (search.q ?? "").toLowerCase()) {
      return { items: pool.filter((e) => !search.cat || e.category === search.cat), widened: true };
    }
    return { items: matched, widened: false };
  }, [entries, filter, query, alt, search.from, search.q, search.cat]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus.APP
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

          <KeyCallout />

          {alt && (
            <p className="mt-8 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              {widened
                ? `No other listing shares "${search.q}". Showing every other ${search.cat ?? "interface"} instead`
                : `${items.length} alternative${items.length === 1 ? "" : "s"} to ${sourceName ?? search.from} matching "${search.q}"`}
              . Compare their recorded health before choosing; always call the provider directly.
            </p>
          )}

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
              className="h-9 w-full rounded-full border border-border/60 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 sm:ml-auto sm:h-8 sm:w-44"
            />
          </div>

          <ul className="mt-8 divide-y divide-border/60 border-t border-border/60">
            {items.map((entry) => (
              <li key={entry.slug} className="group py-5">
                <Link to="/registry/$slug" params={{ slug: entry.slug }} className="block">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium group-hover:text-primary">{entry.name}</span>
                    <Health entry={entry} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{entry.summary}</p>
                  <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground/70">
                    {entry.category} · {entry.endpoint} · auth: {entry.auth_mode}
                  </p>
                </Link>
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
