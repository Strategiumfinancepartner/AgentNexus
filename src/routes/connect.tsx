import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AGENT_EXAMPLE,
  MCP_SNIPPETS,
  NO_AUTH_SNIPPETS,
  useOrigin,
  type Snippet,
} from "@/lib/site";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect an agent — Agent Nexus" },
      {
        name: "description",
        content:
          "Add Agent Nexus to Claude, Cursor, VS Code or any MCP client in one line, or call the registry anonymously over HTTP. Copy-paste config for every client.",
      },
      { property: "og:title", content: "Connect an agent to Agent Nexus" },
      {
        property: "og:description",
        content:
          "One-line MCP install for Claude, Cursor, VS Code and Windsurf — plus a no-auth HTTP API for everything else.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Connect,
});

function CodeBlock({ snippet, origin }: { snippet: Snippet; origin: string }) {
  const [copied, setCopied] = useState(false);
  const code = snippet.code(origin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card/50">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{snippet.client}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground/70">
            {snippet.hint}
          </p>
        </div>
        <button
          onClick={copy}
          className="shrink-0 rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Connect() {
  const origin = useOrigin();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: "var(--color-primary)" }}
      />
      <div className="relative mx-auto max-w-3xl px-6 pb-24">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-xs tracking-[0.28em] uppercase"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus
          </Link>
          <div className="flex items-center gap-4 font-mono text-xs">
            <Link to="/explore" className="text-muted-foreground hover:text-foreground">
              Explore
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          </div>
        </header>

        <main>
          <section className="pt-20 pb-12">
            <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
              Connect
            </p>
            <h1 className="mt-6 text-4xl leading-[1.1] font-medium tracking-tight text-balance">
              Give your agent a map of the callable web.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              One line to install as an MCP server, or a single HTTP call with no
              account at all. Reading the registry never requires auth — signing
              in is only needed to submit, vote and report as an identity.
            </p>
          </section>

          <section className="border-t border-border/60 py-12">
            <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              30-second quickstart — no account
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Ask the registry what can solve a need. It answers with the
              endpoint, the auth contract and a live reliability score.
            </p>
            <div className="mt-6 space-y-3">
              {NO_AUTH_SNIPPETS.map((s) => (
                <CodeBlock key={s.id} snippet={s} origin={origin} />
              ))}
            </div>
          </section>

          <section className="border-t border-border/60 py-12">
            <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              Install as an MCP server
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Streamable HTTP at{" "}
              <code className="font-mono text-primary/80">{origin}/mcp</code>. Read
              tools work immediately; write tools (submit, vote, report) trigger a
              standard OAuth 2.1 consent the first time.
            </p>
            <div className="mt-6 space-y-3">
              {MCP_SNIPPETS.map((s) => (
                <CodeBlock key={s.id} snippet={s} origin={origin} />
              ))}
            </div>
          </section>

          <section className="border-t border-border/60 py-12">
            <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              Tools exposed over MCP
            </h2>
            <ul className="mt-6 space-y-2.5 text-sm">
              {[
                ["discover_capabilities", "need → callable interfaces, with the full call contract", "read"],
                ["search_registry", "keyword lookup across every indexed interface", "read"],
                ["get_entry", "one interface, complete machine contract", "read"],
                ["list_categories", "the three layers and their counts", "read"],
                ["submit_entry", "add an interface the registry is missing", "write"],
                ["vote_entry", "signal that an interface is actually useful", "write"],
                ["report_invocation", "report what happened on a real call", "write"],
                ["list_my_submissions", "track review status of what you submitted", "write"],
              ].map(([name, desc, kind]) => (
                <li key={name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <code className="font-mono text-[12px] text-primary/85">{name}</code>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                      kind === "read"
                        ? "border-border text-muted-foreground/70"
                        : "border-primary/40 text-primary/80"
                    }`}
                  >
                    {kind}
                  </span>
                  <span className="text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border/60 py-12">
            <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              A full agent loop
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Discover an interface, read its contract, call it, then feed the
              outcome back so the next agent gets a better answer.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-xl border border-border/70 bg-card/50 px-4 py-4 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
              <code>{AGENT_EXAMPLE(origin)}</code>
            </pre>
          </section>

          <section className="border-t border-border/60 py-12">
            <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              Machine surfaces
            </h2>
            <ul className="mt-6 space-y-2 font-mono text-[12px]">
              {[
                ["/llms.txt", "full catalog, plain text, prompt-ready"],
                ["/agents.txt", "short directive file for autonomous agents"],
                ["/openapi.json", "OpenAPI 3.1 — GPT Actions, LangChain, n8n"],
                ["/.well-known/ai-plugin.json", "plugin manifest"],
                ["/.well-known/agent.json", "A2A agent card"],
                ["/.well-known/agent-card.json", "A2A agent card (new path)"],
                ["/server.json", "MCP registry manifest"],
                ["/.well-known/mcp.json", "endpoint discovery"],
                ["/api/public/registry", "JSON search"],
                ["/api/public/discover", "capability discovery"],
                ["/api/public/capabilities", "vocabulary index"],
                ["/api/public/entries.ndjson", "bulk catalog, one JSON per line"],
                ["/api/public/report", "invocation feedback"],
                ["/feed.xml", "new interfaces, pollable RSS"],
                ["/sitemap.xml", "human + crawler index"],
              ].map(([path, desc]) => (
                <li key={path}>
                  <a href={path} className="text-muted-foreground hover:text-foreground">
                    {path}
                  </a>
                  <span className="text-muted-foreground/50"> — {desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
}
