import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getStatus } from "@/lib/status.functions";
import { formatPercent, type StatusEntry, type UptimeDay } from "@/lib/uptime-core";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — 30-day uptime for every interface in Agent Nexus (agentnexus.app)" },
      {
        name: "description",
        content:
          "Public reliability history for every API, MCP server and CLI in the Agent Nexus registry: 30-day uptime, average latency and recent incidents, updated automatically as the probes rotate.",
      },
      { property: "og:title", content: "Agent Nexus (agentnexus.app) status — public uptime history" },
      {
        property: "og:description",
        content:
          "30-day uptime, latency and incidents for every interface agents can call. Open JSON at /api/public/status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/status" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/status" }],
  }),
  loader: () => getStatus(),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">
      The status history is temporarily unavailable. Please retry in a moment.
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-muted-foreground">Nothing here.</main>
  ),
  component: Status,
});

function dayTone(day: UptimeDay) {
  if (day.checks === 0) return "bg-border/50";
  if (day.ok === day.checks) return "bg-primary/80";
  if (day.ok === 0) return "bg-destructive/80";
  return "bg-amber-500/80";
}

function Timeline({ entry }: { entry: StatusEntry }) {
  return (
    <div className="mt-3 flex items-end gap-[3px]" aria-hidden>
      {entry.days.map((day) => (
        <span
          key={day.day}
          title={
            day.checks === 0
              ? `${day.day} · no check`
              : `${day.day} · ${day.ok}/${day.checks} ok${day.avg_latency ? ` · ${day.avg_latency}ms` : ""}`
          }
          className={`h-6 flex-1 rounded-[2px] ${dayTone(day)}`}
        />
      ))}
    </div>
  );
}

function Status() {
  const {
    totals,
    entries,
    incidents,
    window_days,
    generated_at,
    schema_validation: schema,
  } = Route.useLoaderData();
  const [onlyMonitored, setOnlyMonitored] = useState(true);
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries
      .filter((e) => (!onlyMonitored || e.days.some((d) => d.checks > 0)))
      .filter((e) => !term || `${e.name} ${e.slug}`.toLowerCase().includes(term))
      .sort((a, b) => (a.window_uptime ?? 2) - (b.window_uptime ?? 2));
  }, [entries, onlyMonitored, query]);

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
            <Link to="/explore" className="transition-colors hover:text-foreground">
              Registry
            </Link>
            <a href="/api/public/status" className="transition-colors hover:text-foreground">
              JSON
            </a>
            <Link to="/connect" className="transition-colors hover:text-foreground">
              Connect
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-24">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Reliability history</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Every probeable interface is probed automatically — each one about once a day.
            This page is the public record — same numbers agents read over{" "}
            <a
              href="/api/public/status"
              className="text-foreground underline underline-offset-4"
            >
              /api/public/status
            </a>
            .
          </p>

          <div className="mt-6 max-w-xl rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Two levels of checks — never mixed</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <span className="text-foreground">Service tested</span> — we call the interface
                itself. Only these count toward uptime and the "Monitored" figure.
              </li>
              <li>
                <span className="text-foreground">Publisher reachable</span> — some interfaces have
                no address we can call as-is (it needs your own key or server name). For those we
                only check that the publisher's documentation page is online. That proves the
                publisher is alive, not that the service works.
                {totals.docs_tracked ? (
                  <>
                    {" "}
                    Currently {totals.docs_reachable ?? 0}/{totals.docs_tracked} reachable.
                  </>
                ) : null}
              </li>
              <li>
                <span className="text-foreground">Not checked</span> — tools installed on your own
                machine (CLI) have nothing online to test, so they show no history.
              </li>
            </ul>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-4">
            {[
              { label: `${window_days}-day uptime`, value: formatPercent(totals.uptime) },
              { label: "Checks recorded", value: totals.checks.toLocaleString("en-US") },
              {
                label: "Median-ish latency",
                value: totals.avg_latency_ms ? `${totals.avg_latency_ms}ms` : "—",
              },
              { label: "Monitored", value: `${totals.monitored}/${totals.entries}` },
            ].map((stat) => (
              <div key={stat.label} className="bg-background px-4 py-5">
                <dt className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-2 text-xl font-medium tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setOnlyMonitored((v) => !v)}
              className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-widest uppercase transition-colors ${
                onlyMonitored
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              Monitored only
            </button>
            <span className="font-mono text-[11px] text-muted-foreground">
              {items.length} shown
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search interfaces"
              className="ml-auto h-8 w-44 rounded-full border border-border/60 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40"
            />
          </div>

          <ul className="mt-8 divide-y divide-border/60 border-t border-border/60">
            {items.map((entry) => (
              <li key={entry.slug} className="py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{entry.name}</span>
                  <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                    {formatPercent(entry.window_uptime)}
                    {entry.avg_latency_ms ? ` · ${entry.avg_latency_ms}ms` : ""}
                  </span>
                </div>
                <Timeline entry={entry} />
                <p className="mt-2 font-mono text-[10px] text-muted-foreground/70">
                  {entry.category} · {entry.checks_ok}/{entry.checks_total} lifetime checks ok ·{" "}
                  {entry.health_checked_at
                    ? `last probe ${new Date(entry.health_checked_at).toISOString().slice(0, 16).replace("T", " ")}Z`
                    : "never probed"}
                </p>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-10 text-sm text-muted-foreground">No interface matches.</li>
            )}
          </ul>

          <section className="mt-16">
            <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Response schema validation
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Beyond liveness: for AI APIs we pin each provider's documented response schema and
              verify a real response matches it. A body that parses but is missing or has renamed a
              required field is a shape failure — confirmed on a second attempt before it is ever
              published. Rolling out: AI APIs first.
            </p>
            <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
              {(schema?.entries ?? []).map((entry) => (
                <li
                  key={entry.slug}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 font-mono text-[11px]"
                >
                  <span className="text-foreground">{entry.name}</span>
                  <span
                    className={
                      entry.ok === false
                        ? "text-destructive"
                        : entry.ok === true
                          ? "text-muted-foreground"
                          : "text-muted-foreground/70"
                    }
                  >
                    {entry.ok === true ? "schema ok" : entry.ok === false ? "shape failure" : "not verified"} ·{" "}
                    {entry.detail?.slice(0, 90) ?? "—"} ·{" "}
                    {new Date(entry.checked_at).toISOString().slice(0, 16).replace("T", " ")}Z
                  </span>
                </li>
              ))}
              {(!schema || schema.entries.length === 0) && (
                <li className="py-6 text-sm text-muted-foreground">
                  Rolling out — AI APIs first. Results appear here at the next health-check run.
                </li>
              )}
            </ul>
          </section>

          <section className="mt-16">
            <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Recent incidents
            </h2>
            <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
              {incidents.map((incident, index) => (
                <li
                  key={`${incident.slug}-${incident.checked_at}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3 font-mono text-[11px]"
                >
                  <span className="text-foreground">{incident.name}</span>
                  <span className="text-muted-foreground">
                    {new Date(incident.checked_at).toISOString().slice(0, 16).replace("T", " ")}Z ·{" "}
                    {incident.status_code ?? "no response"} ·{" "}
                    {incident.error?.slice(0, 60) ?? "unreachable"}
                  </span>
                </li>
              ))}
              {incidents.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">
                  No failed probe in the last 30 days.
                </li>
              )}
            </ul>
          </section>

          <section className="mt-16">
            <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Independent monitors
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Third parties that watch Agent Nexus from the outside, quoted with their own wording:
            </p>
            <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
              <li className="py-4">
                <span className="font-medium">Talandor</span>{" "}
                <span className="text-muted-foreground">(talandor.com)</span>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  “Talandor (talandor.com) checks the public availability of Agent Nexus and
                  consults the public catalogue and health signals published by Agent Nexus. It
                  does not invoke the tools listed in the registry or certify that they work with
                  a particular assistant.”
                </p>
              </li>
            </ul>
          </section>

          <p className="mt-16 font-mono text-[10px] text-muted-foreground/70">
            Generated {generated_at}
          </p>
        </main>
      </div>
    </div>
  );
}
