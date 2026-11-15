import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { receiptGuideTitle, receiptGuideDescription, receiptGuideSections, receiptGuideMarkdown } from "@/lib/health-receipt-guide";

export const Route = createFileRoute("/guides/health-receipts")({
  head: () => ({ meta: [
    { title: `${receiptGuideTitle} | Agent Nexus` },
    { name: "description", content: receiptGuideDescription },
    { property: "og:title", content: `${receiptGuideTitle} | Agent Nexus` },
    { property: "og:description", content: receiptGuideDescription },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://agentnexus.app/guides/health-receipts" }] }),
  component: ReceiptGuide,
});

function ReceiptGuide() {
  function download() {
    const url = URL.createObjectURL(new Blob([receiptGuideMarkdown], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "agent-nexus-health-receipts.md"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-3xl px-6 pb-16">
      <header className="flex flex-wrap justify-between gap-4 border-b border-border py-5">
        <Link to="/" className="flex items-center gap-3 text-sm font-medium"><img src="/logo-400.png" alt="" width={28} height={28} className="size-7 rounded-md" />Agent Nexus</Link>
        <Link to="/connect" className="text-sm text-muted-foreground">Connect</Link>
      </header>
      <main>
        <div className="border-b border-border py-12">
          <h1 className="text-3xl font-medium sm:text-4xl">{receiptGuideTitle}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{receiptGuideDescription}</p>
          <div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" onClick={download}><Download />Article Markdown</Button>
            <Button asChild><a href="https://github.com/Strategiumfinancepartner/AgentNexus/blob/main/docs/health-receipts.md">Verification contract</a></Button></div>
        </div>
        <article className="divide-y divide-border">{receiptGuideSections.map((s) => <section key={s.title} className="py-8"><h2 className="text-xl font-medium">{s.title}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{s.text}</p></section>)}</article>
        <section className="border-t border-border py-8"><h2 className="text-xl font-medium">Request a receipt</h2>
          <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs leading-6"><code>{'POST https://agentnexus.app/api/public/health-card/<slug>\nContent-Type: application/json\nx-api-key: <your private key>\n\n{"nonce":"<fresh random URL-safe nonce, 16-128 characters>"}'}</code></pre>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">Keys belong in headers, never URLs. Receipt requests use your existing shared quota; no plan or price changes.</p>
        </section>
      </main>
      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">Agent Nexus / agentnexus.app</footer>
    </div>
  </div>;
}