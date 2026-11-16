import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download, ArrowRight } from "lucide-react";
import { quickstartTitle, quickstartDescription, quickstartPath, quickstartSections, quickstartMarkdown } from "@/lib/ai-quickstart";

export const Route = createFileRoute("/guides/ai-quickstart")({
  head: () => ({ meta: [
    { title: `${quickstartTitle} | Agent Nexus` },
    { name: "description", content: quickstartDescription },
    { property: "og:title", content: `${quickstartTitle} | Agent Nexus` },
    { property: "og:description", content: quickstartDescription },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: `https://agentnexus.app${quickstartPath}` }] }),
  component: Quickstart,
});

function Quickstart() {
  function download() {
    const url = URL.createObjectURL(new Blob([quickstartMarkdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "agent-nexus-ai-quickstart.md"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-3xl px-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5">
        <Link to="/" className="flex items-center gap-3 text-sm font-medium"><img src="/logo-400.png" alt="" width={28} height={28} className="size-7 rounded-md" />Agent Nexus</Link>
        <Button variant="ghost" asChild><Link to="/connect">Client setup<ArrowRight /></Link></Button>
      </header>
      <main>
        <div className="border-b border-border py-10">
          <p className="mb-4 text-xs font-mono uppercase text-primary">Quick tutorial</p>
          <h1 className="text-3xl font-medium leading-tight sm:text-4xl">{quickstartTitle}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{quickstartDescription}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={download}><Download />Article Markdown</Button>
            <Button asChild><a href="https://github.com/Strategiumfinancepartner/AgentNexus/blob/main/examples/first_weather_task.py">Weather task example<ArrowRight /></a></Button>
          </div>
        </div>
        <article className="divide-y divide-border">{quickstartSections.map(section => <section key={section.title} className="min-w-0 py-7">
          <h2 className="text-xl font-medium leading-7">{section.title}</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{section.text}</p>
          {section.code && <pre className="mt-5 whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4 text-xs leading-6"><code>{section.code}</code></pre>}
        </section>)}</article>
        <div className="flex flex-wrap gap-3 border-t border-border py-7"><Button asChild><Link to="/free-key">Free key</Link></Button><Button variant="outline" asChild><Link to="/guides/health-receipts">Signed evidence guide</Link></Button></div>
      </main>
      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">Agent Nexus / agentnexus.app</footer>
    </div>
  </div>;
}