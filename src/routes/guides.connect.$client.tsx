import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getClientGuide } from "@/lib/client-guides";

export const Route = createFileRoute("/guides/connect/$client")({
  loader: ({ params }) => {
    const guide = getClientGuide(params.client);
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.client ?? params.client;
    const title = `Connect Agent Nexus to ${name} — setup guide`;
    const desc = loaderData?.summary ?? "Setup guide for Agent Nexus.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `https://agentnexus.app/guides/connect/${params.client}` }],
    };
  },
  notFoundComponent: () => (
    <div className="p-16 text-center">Guide not found. <Link to="/guides/connect" className="text-primary">All guides</Link></div>
  ),
  component: Guide,
});

function Guide() {
  const g = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/guides/connect" className="font-mono text-xs text-muted-foreground hover:text-foreground">← All guides</Link>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.28em] text-primary">{g.vendor}</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight">Connect Agent Nexus to {g.client}</h1>
        <p className="mt-4 text-muted-foreground">{g.summary}</p>
        <ol className="mt-10 space-y-8">
          {g.steps.map((s, i) => (
            <li key={s.title}>
              <h2 className="font-medium">{i + 1}. {s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              {s.code && (
                <pre className="mt-3 overflow-x-auto rounded-xl border border-border/70 bg-card/50 px-4 py-3 font-mono text-[11.5px] text-muted-foreground"><code>{s.code}</code></pre>
              )}
            </li>
          ))}
        </ol>
        <section className="mt-12 border-t border-border/60 pt-8">
          <h2 className="font-medium">Test it</h2>
          <p className="mt-2 text-sm text-muted-foreground">{g.verify}</p>
          <p className="mt-4 text-sm text-muted-foreground">Reads need no key. For 1,000 calls/day, get a <Link to="/free-key" className="text-primary">free key</Link>. Official docs: <a href={g.docs} className="text-primary" rel="noreferrer">{g.docs}</a></p>
        </section>
      </main>
    </div>
  );
}
