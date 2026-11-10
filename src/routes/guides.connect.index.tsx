import { createFileRoute, Link } from "@tanstack/react-router";
import { CLIENT_GUIDES } from "@/lib/client-guides";

export const Route = createFileRoute("/guides/connect/")({
  head: () => ({
    meta: [
      { title: "Plug Agent Nexus into your AI assistant — step-by-step guides" },
      { name: "description", content: "Step-by-step setup for Meta Muse Spark, Codex, VS Code Copilot, Claude Code, Cursor, Windsurf, Gemini CLI and OpenCode." },
      { property: "og:title", content: "Plug Agent Nexus into your AI assistant" },
      { property: "og:description", content: "One guide per client: Muse Spark, Codex, VS Code, Claude Code, Cursor, Windsurf, Gemini CLI, OpenCode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/guides/connect" }],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/connect" className="font-mono text-xs text-muted-foreground hover:text-foreground">← Connect</Link>
        <h1 className="mt-6 text-4xl font-medium tracking-tight">Plug Agent Nexus into your assistant</h1>
        <p className="mt-4 text-muted-foreground">Pick your client. Every guide uses the same endpoint and ends with a test prompt.</p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {CLIENT_GUIDES.map((g) => (
            <li key={g.slug}>
              <Link to="/guides/connect/$client" params={{ client: g.slug }} className="block rounded-xl border border-border/70 bg-card/50 p-4 hover:border-primary/60">
                <p className="font-medium">{g.client}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{g.vendor}</p>
                <p className="mt-2 text-sm text-muted-foreground">{g.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
