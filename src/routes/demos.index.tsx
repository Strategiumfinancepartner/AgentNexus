import { createFileRoute, Link } from "@tanstack/react-router";
import { DEMOS } from "@/lib/demos";

const TITLE = "Live demos: how agents find working APIs — Agent Nexus";
const DESC = "Five live Agent Nexus demos: find a geolocation, payment or web search API, compare three providers, and get an alternative when a service goes down.";

export const Route = createFileRoute("/demos/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/demos" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/demos" }],
  }),
  component: DemosIndex,
});

function DemosIndex() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-foreground">
      <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-foreground">← Agent Nexus</Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Find the right service. Verify it works. Get everything needed to use it.</h1>
      <p className="mt-4 text-muted-foreground">Each demo runs the real discovery engine against the live registry when the page loads.</p>
      <ul className="mt-10 space-y-4">
        {DEMOS.map((d) => (
          <li key={d.slug} className="rounded-lg border border-border bg-card p-5">
            <Link to="/demos/$slug" params={{ slug: d.slug }} className="text-lg font-medium hover:underline">{d.title}</Link>
            <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
