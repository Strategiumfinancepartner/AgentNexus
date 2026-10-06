import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { getPublicEntry, type PublicEntryDetail } from "@/lib/public-registry.functions";
import { CopyExample } from "@/components/copy-example";
import { KeyCallout } from "@/components/key-callout";

const ORIGIN = "https://agentnexus.app";

const KIND: Record<string, string> = {
  api: "HTTP API",
  mcp: "MCP server",
  cli: "CLI",
};

/**
 * Slugs arrive from third-party lists with trailing markdown punctuation
 * (`jq-cli):`), percent-encoding, or as an unfilled template (`{slug}`).
 * Normalise before hitting the server fn, which rejects anything else with a
 * 500. Anything that is not a plausible slug becomes a clean 404 page.
 */
function cleanSlug(raw: string): string | null {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    // keep raw when it is not valid percent-encoding
  }
  s = s.trim().replace(/^[^a-z0-9]+/i, "").replace(/[^a-z0-9]+$/i, "").toLowerCase();
  // Placeholders copied from docs plus plural list words ("entries", "all"…)
  // all mean "the catalogue", not one entry — send them to the browsable list.
  if (
    ["slug", "entry", "id", "name", "example", "entries", "all", "list", "index", "catalog", "catalogue"].includes(s)
  )
    return null;
  return /^[a-z0-9-]{1,80}$/.test(s) ? s : null;
}

export const Route = createFileRoute("/registry/$slug")({
  loader: async ({ params }) => {
    const slug = cleanSlug(params.slug);
    // Crawlers copy the documented `{slug}` placeholder verbatim. Send them to
    // the browsable list instead of scoring a 404 against us.
    if (!slug) throw redirect({ to: "/explore", statusCode: 308 });
    if (slug !== params.slug) {
      throw redirect({ to: "/registry/$slug", params: { slug }, statusCode: 301 });
    }
    const result = await getPublicEntry({ data: { slug } });
    if (!result) throw notFound();
    if ("redirectTo" in result) {
      // Retired duplicate slug — permanent redirect to the canonical entry.
      throw redirect({
        to: "/registry/$slug",
        params: { slug: result.redirectTo },
        statusCode: 301,
      });
    }
    return result as PublicEntryDetail;
  },
  head: ({ loaderData }) => {
    const entry = loaderData as PublicEntryDetail | undefined;
    if (!entry) return {};
    const kind = KIND[entry.category] ?? entry.category;
    // Searchers type "<tool> api" or "<tool> api down": answer status + how to call.
    const uptime =
      entry.checks_total > 0 ? Math.round((entry.checks_ok / entry.checks_total) * 100) : null;
    const title = `Is ${entry.name} up? Live status, uptime & how to call it | Agent Nexus`;
    const statusBit =
      uptime !== null
        ? `${entry.name} status: ${uptime}% uptime over ${entry.checks_total} live checks.`
        : `${entry.name} live status and health checks.`;
    const description = `${statusBit} Endpoint, auth (${entry.auth_mode}) and a copy-paste call example. ${entry.summary}`.slice(
      0,
      158,
    );
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `${entry.name} — ${kind} for AI agents` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `${ORIGIN}/registry/${entry.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: entry.name,
            applicationCategory: "DeveloperApplication",
            description: entry.summary,
            url: `${ORIGIN}/registry/${entry.slug}`,
            ...(entry.docs_url ? { sameAs: entry.docs_url } : {}),
            keywords: [kind, ...entry.tags].join(", "),
            offers: { "@type": "Offer", description: entry.pricing || "see provider" },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
      This interface is not in the registry.{" "}
      <Link to="/explore" className="text-foreground underline underline-offset-4">
        Browse the registry
      </Link>
      .
    </main>
  ),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
      The registry is temporarily unavailable. Please retry in a moment.
    </main>
  ),
  component: EntryPage,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/60 py-4">
      <dt className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm break-words">{children}</dd>
    </div>
  );
}

function EntryPage() {
  const entry = Route.useLoaderData();
  const kind = KIND[entry.category] ?? entry.category;
  const monitored = /^https?:\/\//i.test(entry.endpoint) && !/[{<][^{}<>\s]+[}>]/.test(entry.endpoint);
  const health =
    entry.health_ok === null
      ? "not monitored"
      : entry.health_ok
        ? monitored
          ? "operational"
          : "reference verified"
        : "unreachable";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6">
        <header className="flex items-center justify-between border-b border-border/60 py-5">
          <Link to="/" className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus.APP
          </Link>
          <Link to="/explore" className="font-mono text-xs text-muted-foreground hover:text-foreground">
            ← registry
          </Link>
        </header>

        <main className="pt-14 pb-24">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {kind} · {health}
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{entry.name}</h1>
          <p className="mt-4 text-muted-foreground">{entry.summary}</p>
          {entry.description && <p className="mt-4 text-sm text-muted-foreground">{entry.description}</p>}

          <dl className="mt-10">
            <Field label="endpoint">
              <code className="font-mono text-[13px]">{entry.endpoint}</code>
            </Field>
            <Field label="auth">{entry.auth_mode}</Field>
            {entry.invocation_example && (
              <Field label="try it">
                <CopyExample command={entry.invocation_example} />
              </Field>
            )}
            {entry.capabilities?.length > 0 && (
              <Field label="capabilities">{entry.capabilities.join(" · ")}</Field>
            )}
            {entry.tags?.length > 0 && <Field label="tags">{entry.tags.join(" · ")}</Field>}
            {entry.pricing && <Field label="pricing">{entry.pricing}</Field>}
            {(entry.input_format || entry.output_format) && (
              <Field label="i/o">
                {entry.input_format || "—"} → {entry.output_format || "—"}
              </Field>
            )}
            {entry.docs_url && (
              <Field label="docs">
                <a
                  href={entry.docs_url}
                  rel="noopener nofollow"
                  target="_blank"
                  className="underline underline-offset-4"
                >
                  {entry.docs_url}
                </a>
              </Field>
            )}
            <Field label="machine-readable">
              <a
                href={`/api/public/registry/${entry.slug}`}
                className="font-mono text-[13px] underline underline-offset-4"
              >
                /api/public/registry/{entry.slug}
              </a>
            </Field>
          </dl>

          <KeyCallout compact />

          <section className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Use it from your agent
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Point any MCP-capable agent (Claude, Cursor, your own) at the no-auth endpoint — it can
              then find {entry.name} and {entry.category === "api" ? "every other listed interface" : "the rest of the registry"} on
              its own:
            </p>
            <div className="mt-4">
              <CopyExample
                command={`claude mcp add --transport http agent-nexus ${ORIGIN}/api/public/mcp`}
              />
            </div>
          </section>

          <p className="mt-10 text-sm text-muted-foreground">
            Agents can discover {entry.name} through the Agent Nexus{" "}
            <a href="/mcp" className="text-foreground underline underline-offset-4">
              MCP server
            </a>
            ,{" "}
            <a href="/llms.txt" className="text-foreground underline underline-offset-4">
              /llms.txt
            </a>{" "}
            or the{" "}
            <a href="/api/public/discover" className="text-foreground underline underline-offset-4">
              discovery API
            </a>
            .
          </p>
        </main>
      </div>
    </div>
  );
}
