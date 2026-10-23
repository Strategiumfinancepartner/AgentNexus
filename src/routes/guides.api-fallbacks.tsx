import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tutorialTitle, tutorialDescription, tutorialPath, tutorialSections, tutorialMarkdown } from "@/lib/fallback-tutorial";

export const Route = createFileRoute("/guides/api-fallbacks")({
  head: () => ({
    meta: [
      { title: `${tutorialTitle} — Agent Nexus` },
      { name: "description", content: tutorialDescription },
      { property: "og:title", content: `${tutorialTitle} — Agent Nexus` },
      { property: "og:description", content: tutorialDescription },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: `https://agentnexus.app${tutorialPath}` },
    ],
    links: [{ rel: "canonical", href: `https://agentnexus.app${tutorialPath}` }],
  }),
  component: FallbackGuide,
});

function CopyCode({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  }
  return (
    <div className="my-5 min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{language}</span>
        <Button variant="ghost" size="icon" onClick={copy} aria-label={copied ? "Copied" : "Copy code"} title={copied ? "Copied" : "Copy code"}>
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <pre className={`p-4 font-mono text-xs leading-6 ${language === "prompt" ? "whitespace-pre-wrap break-words" : "overflow-x-auto"}`}><code>{code}</code></pre>
      {failed && <p role="status" className="px-4 pb-3 text-xs text-muted-foreground">Could not copy. Select the text manually.</p>}
    </div>
  );
}

function FallbackGuide() {
  function download() {
    const url = URL.createObjectURL(new Blob([tutorialMarkdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "agent-nexus-api-fallbacks-devto.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5">
          <Link to="/" className="flex items-center gap-3 text-sm font-medium">
            <img src="/logo-400.png" alt="" width={28} height={28} className="size-7 rounded-md" />
            Agent Nexus
          </Link>
          <Link to="/connect" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">Connect <ArrowRight className="size-4" /></Link>
        </header>
        <main>
          <div className="border-b border-border py-10 sm:py-14">
            <p className="font-mono text-xs text-primary">FIELD GUIDE / 23 OCT 2026</p>
            <h1 className="mt-5 text-3xl font-medium leading-tight sm:text-4xl">{tutorialTitle}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">{tutorialDescription}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button variant="outline" onClick={download}><Download /> dev.to Markdown</Button>
              <span className="font-mono text-xs text-muted-foreground">5 min read · Read-only discovery</span>
            </div>
          </div>
          <article className="divide-y divide-border">
            {tutorialSections.map((section) => (
              <section key={section.title} className="min-w-0 py-8 sm:py-10">
                <h2 className="text-xl font-medium leading-7">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                  {section.paragraphs.map((text) => <p key={text}>{text}</p>)}
                </div>
                {section.code && <CopyCode code={section.code} language={section.language ?? "text"} />}
                {section.after && <p className="mt-4 text-sm leading-7 text-muted-foreground">{section.after}</p>}
              </section>
            ))}
          </article>
          <div className="flex flex-wrap gap-3 border-t border-border pt-8">
            <Button asChild><Link to="/connect">Connect your agent <ArrowRight /></Link></Button>
            <Button variant="outline" asChild><Link to="/explore">Explore the registry</Link></Button>
          </div>
        </main>
        <footer className="mt-12 border-t border-border pt-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Agent Nexus / agentnexus.app</Link>
        </footer>
      </div>
    </div>
  );
}