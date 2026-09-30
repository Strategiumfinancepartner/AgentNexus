import { CopyExample } from "@/components/copy-example";

const CURL = `curl -s -X POST https://agentnexus.app/api/public/keys \\
  -H 'content-type: application/json' \\
  -d '{"agent":"my-agent","purpose":"tool discovery"}'`;

/**
 * The conversion block for the "openapi.json → catalog" visitor: a developer
 * evaluating how to wire an agent. One copyable call mints a free key with no
 * account, no email and no dashboard — say it where they already are.
 */
export function KeyCallout({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Get an API key"
      className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
    >
      <p className="font-mono text-[10px] tracking-widest text-primary uppercase">
        Get a key in one call
      </p>
      <h2 className="mt-2 text-lg font-medium tracking-tight">
        No account, no email, no dashboard
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        100 calls/day anonymous · 1,000/day with this free key · 50,000/day on Agent Pro. The key is
        returned instantly in the response — send it as the <code className="font-mono">x-api-key</code>{" "}
        header on any <code className="font-mono">/api/public/*</code> request.
      </p>
      <div className="mt-4">
        <CopyExample command={CURL} />
      </div>
      {!compact && (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">
          <a href="/openapi.json" className="underline underline-offset-4 hover:text-foreground">
            /openapi.json
          </a>{" "}
          ·{" "}
          <a href="/llms.txt" className="underline underline-offset-4 hover:text-foreground">
            /llms.txt
          </a>{" "}
          ·{" "}
          <a href="/api/public/mcp" className="underline underline-offset-4 hover:text-foreground">
            /api/public/mcp
          </a>{" "}
          ·{" "}
          <a href="/pricing" className="underline underline-offset-4 hover:text-foreground">
            /pricing
          </a>
        </p>
      )}
    </section>
  );
}
