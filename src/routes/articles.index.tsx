import { createFileRoute, Link } from "@tanstack/react-router";
import { ARTICLES } from "@/lib/articles";

const TITLE = "Articles on agent tool discovery and MCP reliability — Agent Nexus";
const DESC = "Technical articles on how AI agents select tools at runtime, why MCP availability is more than an HTTP 200, and why agents need a trust layer.";

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/articles" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/articles" }],
  }),
  component: ArticlesIndex,
});

function ArticlesIndex() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-foreground">
      <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">← Agent Nexus</Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Articles</h1>
      <ul className="mt-10 space-y-4">
        {ARTICLES.map((a) => (
          <li key={a.slug} className="rounded-lg border border-border bg-card p-5">
            <Link to="/articles/$slug" params={{ slug: a.slug }} className="text-lg font-medium hover:underline">{a.title}</Link>
            <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
