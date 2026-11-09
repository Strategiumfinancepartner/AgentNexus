import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { demoBySlug, demoCurl, demoMcp, demoPython } from "@/lib/demos";
import { runDemo } from "@/lib/demos.functions";
import { CopyCode } from "@/components/copy-code";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/demos/$slug")({
  loader: async ({ params }) => {
    const demo = demoBySlug(params.slug);
    if (!demo) throw notFound();
    const live = await runDemo({ data: { slug: params.slug } });
    return { demo, live };
  },
  head: ({ params, loaderData }) => {
    const url = `https://agentnexus.app/demos/${params.slug}`;
    if (!loaderData) return { meta: [{ title: "Demo — Agent Nexus" }, { name: "robots", content: "noindex" }] };
    const t = `${loaderData.demo.title} — Agent Nexus demo`;
    return {
      meta: [
        { title: t },
        { name: "description", content: loaderData.demo.description },
        { property: "og:title", content: t },
        { property: "og:description", content: loaderData.demo.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: loaderData.demo.title,
            description: loaderData.demo.description,
            step: [
              { "@type": "HowToStep", name: "Describe the need", text: `Call discover with need="${loaderData.demo.need}".` },
              { "@type": "HowToStep", name: "Check health", text: "Read current_health and trust.reliability_score on each match." },
              { "@type": "HowToStep", name: "Call the service", text: "Use the call contract (endpoint, auth, limits), then report the outcome." },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => <main className="p-16 text-foreground">Demo not found. <Link to="/demos" className="underline">All demos</Link></main>,
  component: DemoPage,
});

const healthClass: Record<string, string> = {
  up: "text-primary",
  degraded: "text-accent-foreground",
  down: "text-destructive",
  unknown: "text-muted-foreground",
};

function DemoPage() {
  const { demo, live } = Route.useLoaderData();
  const matches: any[] = live?.result?.matches ?? [];
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16 text-foreground">
      <Link to="/demos" className="font-mono text-xs text-muted-foreground hover:text-foreground">← All demos</Link>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">{demo.title}</h1>
      <h2 className="mt-8 text-xl font-medium">The problem</h2>
      <p className="mt-2 text-muted-foreground">{demo.problem}</p>

      <h2 className="mt-8 text-xl font-medium">The request</h2>
      <CopyCode language="curl" code={demoCurl(demo)} />
      <CopyCode language="python" code={demoPython(demo)} />
      <CopyCode language="MCP tools/call" code={demoMcp(demo)} />

      <h2 className="mt-8 text-xl font-medium">Actual result from the registry</h2>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        Computed when this page loaded ({live?.fetchedAt ? new Date(live.fetchedAt).toUTCString() : "n/a"}) from the latest stored probes. Agent Nexus did not call these services for this page.
      </p>
      {live?.error && <p className="mt-4 text-destructive">{live.error}</p>}
      {live?.result && (
        <p className="mt-3 text-sm">Coverage: <span className="font-mono">{live.result.coverage}</span> · {live.result.count} match(es). {live.result.note}</p>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-card font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr><th className="px-3 py-2">Service</th><th className="px-3 py-2">Current health</th><th className="px-3 py-2">Historical reliability</th><th className="px-3 py-2">Auth</th><th className="px-3 py-2">Rate limit</th>{demo.mode === "compare" && <th className="px-3 py-2">Latency</th>}</tr>
          </thead>
          <tbody>
            {matches.length === 0 && <tr><td className="px-3 py-3 text-muted-foreground" colSpan={6}>No match right now.</td></tr>}
            {matches.map((m) => (
              <tr key={m.slug} className="border-t border-border align-top">
                <td className="px-3 py-2"><a href={`/registry/${m.slug}`} className="font-medium hover:underline">{m.name}</a><div className="font-mono text-xs text-muted-foreground break-all">{String(m.call?.endpoint ?? "")}</div>
                  {m.alternatives?.length > 0 && <div className="mt-1 text-xs">Alternatives: {m.alternatives.map((a: any) => a.slug).join(", ")}</div>}
                </td>
                <td className={`px-3 py-2 font-mono ${healthClass[m.current_health?.status] ?? ""}`}>{m.current_health?.status}</td>
                <td className="px-3 py-2 font-mono">{m.trust?.reliability_score ?? "—"}{m.trust?.samples ? ` (${m.trust.samples} probes)` : ""}</td>
                <td className="px-3 py-2 font-mono text-xs">{String(m.call?.auth_mode ?? "")}</td>
                <td className="px-3 py-2 text-xs">{String(m.call?.rate_limit ?? "—")}</td>
                {demo.mode === "compare" && <td className="px-3 py-2 font-mono text-xs">{m.trust?.avg_latency_ms ? `${m.trust.avg_latency_ms} ms` : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{demo.explain}</p>

      <div className="mt-12 rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-medium">Try it in your agent</h2>
        <p className="mt-2 text-sm text-muted-foreground">100 calls/day without a key, 1,000/day with a free key. MCP endpoint: https://agentnexus.app/mcp</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild><Link to="/free-key">Get a free key</Link></Button>
          <Button asChild variant="outline"><Link to="/connect">Connect your agent</Link></Button>
        </div>
      </div>
    </main>
  );
}
