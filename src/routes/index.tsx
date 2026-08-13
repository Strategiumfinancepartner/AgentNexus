import { createFileRoute } from "@tanstack/react-router";
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

function Index() {
  const [filter, setFilter] = useState<"all" | Entry["category"]>("all");
  const items = registry.filter((e) => filter === "all" || e.category === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6">
        <header className="flex items-center justify-between py-10">
          <span className="font-mono text-xs tracking-[0.25em] uppercase">Agent Nexus</span>
          <span className="font-mono text-xs text-muted-foreground">/mcp</span>
        </header>

        <main>
          <section className="pt-10 pb-20">
            <h1 className="text-3xl leading-snug font-medium tracking-tight sm:text-4xl">
              The next billion users of the internet
              <span className="text-muted-foreground"> won't be human.</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Agents don't need landing pages — they need interfaces they can
              call. Agent Nexus catalogs that layer: APIs, MCP servers and CLIs.
            </p>
          </section>

          <section id="registry" className="border-t border-border py-12">
            <div className="flex items-baseline justify-between">
              <h2 className="font-mono text-xs tracking-[0.25em] uppercase text-muted-foreground">
                Registry
              </h2>
              <div className="flex gap-4 font-mono text-xs">
                {(["all", "api", "mcp", "cli"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`uppercase tracking-widest transition-colors ${
                      filter === f
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-8 divide-y divide-border">
              {items.map((e) => (
                <li key={e.slug} className="flex items-baseline gap-4 py-4">
                  <span className="w-10 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {e.category}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {e.summary}
                    </p>
                    <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground/70">
                      {e.endpoint}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="border-t border-border py-8 font-mono text-xs text-muted-foreground">
          {registry.length} callable surfaces indexed
        </footer>
      </div>
    </div>
  );
}
