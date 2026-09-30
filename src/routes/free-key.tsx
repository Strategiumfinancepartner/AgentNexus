import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CopyExample } from "@/components/copy-example";

/**
 * Public, account-free key minting. The pricing page promises "1,000 calls a
 * day with a free key — one step, no account": this page keeps that promise for
 * humans by calling the same machine endpoint (POST /api/public/keys) from the
 * browser. /keys (signed-in) stays the place to manage keys tied to an account.
 */

const CURL = `curl -s -X POST https://agentnexus.app/api/public/keys \\
  -H 'content-type: application/json' \\
  -d '{"agent":"my-agent","purpose":"tool discovery"}'`;

export const Route = createFileRoute("/free-key")({
  component: FreeKeyPage,
  head: () => ({
    meta: [
      { title: "Get a free API key — Agent Nexus" },
      {
        name: "description",
        content:
          "Mint a free Agent Nexus key in one step, no account and no email: 1,000 registry calls a day instead of 100.",
      },
      { property: "og:title", content: "Get a free API key — Agent Nexus" },
      {
        property: "og:description",
        content:
          "One step, no account: a free key lifts you from 100 to 1,000 registry calls a day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function FreeKeyPage() {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function mint() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent: "web-visitor", purpose: "evaluating the registry" }),
      });
      const data = (await res.json()) as { key?: string; error?: string; detail?: string };
      if (!res.ok || !data.key) {
        setError(data.detail || data.error || "Could not issue a key right now.");
      } else {
        setKey(data.key);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <p className="font-mono text-[10px] tracking-widest text-primary uppercase">Free key</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
        No account, no email, no dashboard
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        100 calls a day without a key · 1,000 a day with this free key · 50,000 a day on Agent Pro.
        Send it as the <code className="font-mono">x-api-key</code> header on any{" "}
        <code className="font-mono">/api/public/*</code> request.
      </p>

      {!key && (
        <div className="mt-8">
          <button
            type="button"
            onClick={mint}
            disabled={busy}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Issuing…" : "Generate my free key"}
          </button>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      )}

      {key && (
        <section className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
          <h2 className="text-lg font-medium tracking-tight">Your key — shown once</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Store it now: it cannot be recovered. Nothing else to create.
          </p>
          <div className="mt-4">
            <CopyExample command={key} />
          </div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            1,000 calls/day · header <code>x-api-key</code> · 1 submission per key and per source address per 24h
            (human-reviewed)
          </p>
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-sm font-medium tracking-tight text-foreground">
          Planning to upgrade later?
        </h2>
        <p className="mt-2">
          This key is anonymous: it is not attached to any account, so it stays at 1,000 calls a day
          even if you subscribe afterwards. If you expect to go to Agent Pro (50,000 calls a day),
          create your key while signed in on{" "}
          <Link to="/keys" className="underline underline-offset-4 hover:text-foreground">
            /keys
          </Link>{" "}
          — account keys switch to 50,000 automatically the moment the subscription is active,
          with nothing to recreate.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium tracking-tight">From an agent, in one call</h2>
        <div className="mt-3">
          <CopyExample command={CURL} />
        </div>
      </section>

      <div className="mt-10">
        <Link
          to="/"
          className="inline-block rounded-xl border border-border px-5 py-3 text-sm font-medium transition hover:bg-muted"
        >
          ← Back to Agent Nexus home
        </Link>
      </div>

      <p className="mt-8 font-mono text-[11px] text-muted-foreground">
        <Link to="/pricing" className="underline underline-offset-4 hover:text-foreground">
          /pricing
        </Link>{" "}
        ·{" "}
        <a href="/api/public/mcp" className="underline underline-offset-4 hover:text-foreground">
          /api/public/mcp
        </a>{" "}
        ·{" "}
        <a href="/llms.txt" className="underline underline-offset-4 hover:text-foreground">
          /llms.txt
        </a>
      </p>
    </main>
  );
}
