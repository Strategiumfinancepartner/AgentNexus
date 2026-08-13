import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getEntry, getMyAccess, listVotes, toggleVote } from "@/lib/registry.functions";
import { VoteButton } from "@/components/vote-button";
import { AppShell, HealthBadge } from "@/components/app-shell";
import { reliability } from "@/lib/registry-core";

export const Route = createFileRoute("/_authenticated/entry/$slug")({
  head: () => ({
    meta: [
      { title: "Entry — Agent Nexus" },
      {
        name: "description",
        content:
          "Endpoint, authentication mode, tags and health history for a callable surface in the Agent Nexus registry.",
      },
      { property: "og:title", content: "Entry — Agent Nexus" },
      {
        property: "og:description",
        content: "Endpoint, auth mode and health history for this callable surface.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EntryPage,
});

function EntryPage() {
  const { slug } = Route.useParams();
  const fetchEntry = useServerFn(getEntry);
  const fetchAccess = useServerFn(getMyAccess);
  const fetchVotes = useServerFn(listVotes);
  const vote = useServerFn(toggleVote);
  const queryClient = useQueryClient();

  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const query = useQuery({
    queryKey: ["entry", slug],
    queryFn: () => fetchEntry({ data: { slug } }),
  });

  const entry = query.data?.entry;
  const votes = useQuery({ queryKey: ["votes"], queryFn: () => fetchVotes() });
  const voteMutation = useMutation({
    mutationFn: (entryId: string) => vote({ data: { entryId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["votes"] });
      queryClient.invalidateQueries({ queryKey: ["access"] });
    },
  });

  return (
    <AppShell isAdmin={access.data?.isReviewer ?? false}>
      <main className="pt-12 pb-20">
        <Link
          to="/registry"
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Registry
        </Link>

        {query.isPending && (
          <p className="py-10 font-mono text-xs text-muted-foreground">loading entry…</p>
        )}

        {query.isSuccess && !entry && (
          <p className="py-10 font-mono text-xs text-muted-foreground">
            No entry with this identifier is visible to your account.
          </p>
        )}

        {entry && (
          <>
            <header className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary/80">
                  {entry.category}
                </span>
                <HealthBadge ok={entry.health_ok} checkedAt={entry.health_checked_at} />
                {entry.verified && (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                    verified
                  </span>
                )}
                {entry.featured && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    featured
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <VoteButton
                  count={votes.data?.votes[entry.id] ?? 0}
                  voted={votes.data?.mine.includes(entry.id) ?? false}
                  disabled={voteMutation.isPending || entry.status !== "approved"}
                  onClick={() => voteMutation.mutate(entry.id)}
                />
                <h1 className="text-3xl font-medium tracking-tight">{entry.name}</h1>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {entry.summary}
              </p>
            </header>

            <dl className="mt-10 divide-y divide-border/60 border-y border-border/60">
              <Row label="Endpoint">
                <code className="font-mono text-xs break-all text-foreground">
                  {entry.endpoint}
                </code>
              </Row>
              <Row label="Auth">{entry.auth_mode}</Row>
              <Row label="Tags">{entry.tags.length ? entry.tags.join(" · ") : "—"}</Row>
              <Row label="Docs">
                {entry.docs_url ? (
                  <a
                    href={entry.docs_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {entry.docs_url}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Latency">
                {entry.health_latency_ms ? `${entry.health_latency_ms} ms` : "—"}
              </Row>
              <Row label="Capabilities">
                {entry.capabilities?.length ? (
                  <span className="font-mono text-xs">{entry.capabilities.join(" · ")}</span>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Auth params">
                {entry.auth_params?.length
                  ? entry.auth_params
                      .map((p) => `${p.name} (${p.location}${p.required ? "" : ", optional"})`)
                      .join(" · ")
                  : "—"}
              </Row>
              <Row label="Formats">
                {entry.input_format || entry.output_format
                  ? `${entry.input_format || "—"} → ${entry.output_format || "—"}`
                  : "—"}
              </Row>
              <Row label="Rate limit">{entry.rate_limit || "—"}</Row>
              <Row label="Pricing">{entry.pricing || "—"}</Row>
              <Row label="Reliability">
                {(() => {
                  const r = reliability(entry);
                  return r.score === null
                    ? "unproven — no probe yet"
                    : `${r.score}/100 · ${r.grade} · uptime ${Math.round((r.uptime ?? 0) * 100)}% over ${r.samples} probes${r.avgLatencyMs ? ` · ~${r.avgLatencyMs} ms` : ""}`;
                })()}
              </Row>
            </dl>

            {entry.invocation_example && (
              <pre className="mt-8 overflow-x-auto rounded-xl border border-border bg-card/50 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {entry.invocation_example}
              </pre>
            )}

            {entry.description && (
              <p className="mt-8 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {entry.description}
              </p>
            )}

            <section className="mt-12">
              <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
                Health history
              </h2>
              {query.data?.history.length ? (
                <ul className="mt-4 space-y-1 font-mono text-[11px]">
                  {query.data.history.map((h, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 py-1">
                      <span className="text-muted-foreground/70">
                        {new Date(h.checked_at as string).toISOString().replace("T", " ").slice(0, 16)}
                      </span>
                      <span className={h.ok ? "text-primary" : "text-destructive"}>
                        {h.ok ? "up" : "down"} · {h.status_code ?? "—"} ·{" "}
                        {h.latency_ms ?? "—"} ms
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">
                  no probe recorded yet
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 py-3.5">
      <dt className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-muted-foreground">{children}</dd>
    </div>
  );
}
