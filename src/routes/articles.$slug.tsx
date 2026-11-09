import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { articleBySlug } from "@/lib/articles";
import { CopyCode } from "@/components/copy-code";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/articles/$slug")({
  loader: ({ params }) => {
    const article = articleBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Article — Agent Nexus" }, { name: "robots", content: "noindex" }] };
    const a = loaderData.article;
    const url = `https://agentnexus.app/articles/${params.slug}`;
    return {
      meta: [
        { title: `${a.title} — Agent Nexus` },
        { name: "description", content: a.description },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: a.published },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: a.title,
            description: a.description,
            datePublished: a.published,
            author: { "@type": "Organization", name: "Agent Nexus", url: "https://agentnexus.app" },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => <main className="p-16 text-foreground">Article not found. <Link to="/articles" className="underline">All articles</Link></main>,
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16 text-foreground">
      <Link to="/articles" className="font-mono text-xs text-muted-foreground hover:text-foreground">← All articles</Link>
      <article>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{article.title}</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{article.published}</p>
        <p className="mt-6 text-lg text-muted-foreground">{article.description}</p>
        {article.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-2xl font-medium">{s.heading}</h2>
            {s.body.map((p, i) => <p key={i} className="mt-3 leading-7">{p}</p>)}
            {s.code && <CopyCode language={s.code.language} code={s.code.code} />}
          </section>
        ))}
      </article>
      <div className="mt-12 rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">See it work on live registry data.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild><Link to="/demos">Open the live demos</Link></Button>
          <Button asChild variant="outline"><Link to="/free-key">Get a free key</Link></Button>
        </div>
      </div>
    </main>
  );
}
