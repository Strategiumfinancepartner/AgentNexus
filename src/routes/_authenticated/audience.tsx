import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/registry.functions";
import { getAudience } from "@/lib/audience.functions";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/audience")({
  head: () => ({
    meta: [
      { title: "Audience — Agent Nexus" },
      {
        name: "description",
        content:
          "Who signed up, who signed in recently, and which agents called /mcp, /llms.txt and the public registry APIs.",
      },
      { property: "og:title", content: "Audience — Agent Nexus" },
      {
        property: "og:description",
        content: "Members, sign-ins and machine traffic per entry point.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AudiencePage,
});

function when(value: string | null): string {
  if (!value) return "never";
  const diff = Date.now() - Date.parse(value);
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

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

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        {title}
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-border/60">{children}</div>
    </section>
  );
}

function AudiencePage() {
  const fetchAccess = useServerFn(getMyAccess);
  const fetchAudience = useServerFn(getAudience);

  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const audience = useQuery({
    queryKey: ["audience"],
    queryFn: () => fetchAudience(),
    enabled: access.data?.isReviewer === true,
  });

  const isReviewer = access.data?.isReviewer === true;
  const data = audience.data;

  return (
    <AppShell isAdmin={isReviewer} hasSubscription={access.data?.hasSubscription ?? false}>
      <main className="py-10">
        <h1 className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Audience
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Members and machine traffic over the last 30 days. Callers are identified by API key when
          they send one, otherwise by a one-way hash of their IP — raw addresses are never stored.
        </p>

        {!isReviewer && access.isFetched && (
          <p className="mt-8 font-mono text-xs text-destructive">Reviewer access required.</p>
        )}

        {audience.isLoading && isReviewer && (
          <p className="mt-8 font-mono text-xs text-muted-foreground">Loading…</p>
        )}

        {data && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Members" value={data.totals.members} />
              <Stat label="Signups 7d" value={data.totals.signupsLast7d} />
              <Stat label="Signed in 7d" value={data.totals.activeLast7d} />
              <Stat label="Calls 24h" value={data.totals.hitsLast24h} />
              <Stat label="Calls 30d" value={data.totals.hits30d} />
              <Stat label="Distinct callers" value={data.totals.distinctCallers} />
            </div>

            <Section
              title="Entry points"
              hint="Which machine-facing surface agents actually hit: /mcp, /llms.txt, the public APIs and the manifests."
            >
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Surface</th>
                    <th className="px-3 py-2">Calls</th>
                    <th className="px-3 py-2">Callers</th>
                    <th className="px-3 py-2">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {data.surfaces.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                        No machine traffic recorded yet.
                      </td>
                    </tr>
                  )}
                  {data.surfaces.map((s) => (
                    <tr key={s.surface} className="border-t border-border/40">
                      <td className="px-3 py-2">{s.surface}</td>
                      <td className="px-3 py-2">{s.hits}</td>
                      <td className="px-3 py-2">{s.callers}</td>
                      <td className="px-3 py-2 text-muted-foreground">{when(s.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Members"
              hint="Everyone who created an account, when they signed up and when they last signed in."
            >
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Signed up</th>
                    <th className="px-3 py-2">Last sign-in</th>
                    <th className="px-3 py-2">Keys</th>
                    <th className="px-3 py-2">Entries</th>
                    <th className="px-3 py-2">Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m) => (
                    <tr key={m.email} className="border-t border-border/40">
                      <td className="px-3 py-2">{m.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{when(m.createdAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{when(m.lastSignInAt)}</td>
                      <td className="px-3 py-2">{m.keys}</td>
                      <td className="px-3 py-2">{m.submissions}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {m.roles.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section
              title="Top callers"
              hint="An agent with an API key shows the owning account. Anonymous callers show a hashed IP and their client software."
            >
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Caller</th>
                    <th className="px-3 py-2">Tier</th>
                    <th className="px-3 py-2">Calls</th>
                    <th className="px-3 py-2">Surfaces</th>
                    <th className="px-3 py-2">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {data.callers.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                        No callers recorded yet.
                      </td>
                    </tr>
                  )}
                  {data.callers.map((c) => (
                    <tr key={c.actor} className="border-t border-border/40">
                      <td className="px-3 py-2">
                        {c.email ?? c.actor}
                        {c.country ? (
                          <span className="ml-2 text-muted-foreground">{c.country}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{c.tier}</td>
                      <td className="px-3 py-2">{c.hits}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {c.surfaces.slice(0, 4).join(", ")}
                      </td>
                      <td className="max-w-[16rem] truncate px-3 py-2 text-muted-foreground">
                        {c.userAgent || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="Recent calls" hint="The last 60 machine requests, newest first.">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Surface</th>
                    <th className="px-3 py-2">Caller</th>
                    <th className="px-3 py-2">Client</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                        Nothing yet.
                      </td>
                    </tr>
                  )}
                  {data.recent.map((h, i) => (
                    <tr key={`${h.actor}-${h.createdAt}-${i}`} className="border-t border-border/40">
                      <td className="px-3 py-2 text-muted-foreground">{when(h.createdAt)}</td>
                      <td className="px-3 py-2">
                        {h.method} {h.surface}
                      </td>
                      <td className="px-3 py-2">{h.email ?? h.actor}</td>
                      <td className="max-w-[16rem] truncate px-3 py-2 text-muted-foreground">
                        {h.userAgent || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </>
        )}
      </main>
    </AppShell>
  );
}
