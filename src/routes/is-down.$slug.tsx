import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getStatus } from "@/lib/status.functions";
import { formatPercent, type StatusEntry } from "@/lib/uptime-core";

export const Route = createFileRoute("/is-down/$slug")({
  loader: async ({ params }) => {
    const payload = await getStatus();
    const entry = payload.entries.find((e) => e.slug === params.slug);
    if (!entry) throw notFound();
    return { entry, generated_at: payload.generated_at, window_days: payload.window_days };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.entry.name ?? "This service";
    const slug = loaderData?.entry.slug ?? "";
    const verdict =
      loaderData?.entry.health_ok === true
        ? `${name} is up right now`
        : loaderData?.entry.health_ok === false
          ? `${name} is down right now`
          : `live status of ${name}`;
    return {
      meta: [
        { title: `Is ${name} down? ${verdict} — Agent Nexus` },
        {
          name: "description",
          content: `${verdict}. Live answer from real probes, not user reports: 30-day uptime, latency and recent incidents for ${name}, checked continuously by Agent Nexus.`,
        },
        { property: "og:title", content: `Is ${name} down? ${verdict}` },
        {
          property: "og:description",
          content: `Live probe-based status for ${name}: uptime, latency and incidents, updated continuously.`,
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: `https://agentnexus.app/is-down/${slug}` },
      ],
      links: [{ rel: "canonical", href: `https://agentnexus.app/is-down/${slug}` }],
    };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
      We don't monitor a service under that name.{" "}
      <Link to="/is-down" className="text-foreground underline underline-offset-4">
        Browse everything we probe
      </Link>
      .
    </main>
  ),
  component: IsDownPage,
});

function verdictFor(entry: StatusEntry): { label: string; tone: string; detail: string } {
  if (entry.health_ok === true)
    return {
      label: `${entry.name} is up`,
      tone: "text-primary",
      detail: "Our latest probe got a working answer from the service itself.",
    };
  if (entry.health_ok === false)
    return {
      label: `${entry.name} is down`,
      tone: "text-destructive",
      detail: "Our latest probe failed to get a working answer from the service.",
    };
  return {
    label: `No live probe yet for ${entry.name}`,
    tone: "text-muted-foreground",
    detail: "This interface is listed but has not been probed yet — check back shortly.",
  };
}

function IsDownPage() {
  const { entry, window_days } = Route.useLoaderData();
  const verdict = verdictFor(entry);
  const monitored = entry.days.some((d) => d.checks > 0);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus.APP
          </Link>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <Link to="/is-down" className="transition-colors hover:text-foreground">
              Is it down?
            </Link>
            <Link to="/status" className="transition-colors hover:text-foreground">
              Status
            </Link>
            <Link to="/explore" className="transition-colors hover:text-foreground">
              Registry
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-24">
          <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Live answer · probed, not crowd-reported
          </p>
          <h1 className={`mt-3 text-3xl font-medium tracking-tight sm:text-4xl ${verdict.tone}`}>
            {verdict.label}
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            {verdict.detail}{" "}
            {entry.health_checked_at
              ? `Last probe: ${new Date(entry.health_checked_at).toISOString().slice(0, 16).replace("T", " ")}Z.`
              : ""}
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-3">
            {[
              { label: `${window_days}-day uptime`, value: formatPercent(entry.window_uptime) },
              {
                label: "Avg latency",
                value: entry.avg_latency_ms ? `${entry.avg_latency_ms}ms` : "—",
              },
              {
                label: "Lifetime checks ok",
                value: `${entry.checks_ok}/${entry.checks_total}`,
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-background px-4 py-5">
                <dt className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-2 text-xl font-medium tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {monitored && (
            <section className="mt-10">
              <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                Last {window_days} days
              </h2>
              <div className="mt-3 flex items-end gap-[3px]" aria-hidden>
                {entry.days.map((day) => (
                  <span
                    key={day.day}
                    title={
                      day.checks === 0
                        ? `${day.day} · no check`
                        : `${day.day} · ${day.ok}/${day.checks} ok${day.avg_latency ? ` · ${day.avg_latency}ms` : ""}`
                    }
                    className={`h-6 flex-1 rounded-[2px] ${
                      day.checks === 0
                        ? "bg-border/50"
                        : day.ok === day.checks
                          ? "bg-primary/80"
                          : day.ok === 0
                            ? "bg-destructive/80"
                            : "bg-amber-500/80"
                    }`}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mt-12 rounded-xl border border-border/60 p-5">
            <p className="text-sm text-muted-foreground">
              How we know: Agent Nexus calls {entry.name} directly on a schedule — a real
              request, not a ping of the marketing site. Full contract, auth and health history:{" "}
              <Link
                to="/registry/$slug"
                params={{ slug: entry.slug }}
                className="text-foreground underline underline-offset-4"
              >
                {entry.name} in the registry
              </Link>
              . You can also{" "}
              <Link to="/free-key" className="text-foreground underline underline-offset-4">
                get a free key
              </Link>{" "}
              and receive an alert the moment {entry.name} goes down or changes shape.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
