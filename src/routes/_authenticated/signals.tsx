import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/registry.functions";
import { getOpsInsights } from "@/lib/ops.functions";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/signals")({
  head: () => ({
    meta: [
      { title: "Demand signals — Agent Nexus" },
      {
        name: "description",
        content:
          "What agents asked Agent Nexus for, what the registry could not answer, and what broke when agents actually invoked an indexed interface.",
      },
      { property: "og:title", content: "Demand signals — Agent Nexus" },
      {
        property: "og:description",
        content: "Unmet needs, invocation failures and capability probe results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignalsPage,
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3">
      <div className="font-mono text-2xl">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function SignalsPage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchInsights = useServerFn(getOpsInsights);

  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const insights = useQuery({
    queryKey: ["ops-insights"],
    queryFn: () => fetchInsights(),
    enabled: access.data?.isReviewer === true,
  });

  const isReviewer = access.data?.isReviewer === true;

  return (
    <AppShell isAdmin={isReviewer} hasSubscription={access.data?.hasSubscription ?? false}>
      <main className="py-10">
        <h1 className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Demand signals
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Every discovery query agents run is logged. Queries that matched nothing are the
          registry's growth backlog; invocation reports are the reality check on entries that
          pass their health probe but fail in production.
        </p>

        {!isReviewer && !access.isLoading && (
          <p className="mt-8 font-mono text-xs text-muted-foreground">
            Reviewer access required.
          </p>
        )}

        {insights.isLoading && isReviewer && (
          <p className="mt-8 font-mono text-xs text-muted-foreground">Loading signals…</p>
        )}

        {insights.data && (
          <div className="mt-8 space-y-10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Queries" value={insights.data.totals.queries} />
              <Stat label="Unmet" value={insights.data.totals.unmet} />
              <Stat label="Reports" value={insights.data.totals.reports} />
              <Stat label="Failures" value={insights.data.totals.failures} />
            </div>

            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Unmet needs — coverage gaps
              </h2>
              {insights.data.unmet.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Every logged query matched at least one interface.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60">
                  {insights.data.unmet.map((row) => (
                    <li key={row.need} className="flex items-baseline justify-between gap-4 px-4 py-3">
                      <span className="text-sm">{row.need}</span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        ×{row.occurrences} · {row.sources.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Invocation reports
              </h2>
              {insights.data.reports.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No agent has reported a real invocation yet.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60">
                  {insights.data.reports.map((row, index) => (
                    <li key={`${row.slug}-${index}`} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-mono text-xs">{row.slug}</span>
                        <span
                          className={`font-mono text-[11px] ${
                            row.outcome === "failure" ? "text-destructive" : "text-primary"
                          }`}
                        >
                          {row.outcome}
                          {row.status_code ? ` · ${row.status_code}` : ""}
                          {row.latency_ms != null ? ` · ${row.latency_ms}ms` : ""}
                        </span>
                      </div>
                      {row.error && (
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{row.error}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Capability probes
              </h2>
              {insights.data.capability.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No capability probe has run yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60">
                  {insights.data.capability.map((row) => (
                    <li key={row.slug} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-mono text-xs">{row.name}</span>
                        <span
                          className={`font-mono text-[11px] ${
                            row.capability_ok ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {row.capability_ok ? "contract confirmed" : "contract failed"}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {row.capability_detail || "—"}
                        {row.discovered_tools.length > 0
                          ? ` · tools: ${row.discovered_tools.slice(0, 8).join(", ")}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
