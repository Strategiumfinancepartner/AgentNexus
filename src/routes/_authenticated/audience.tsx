import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyAccess } from "@/lib/registry.functions";
import { getAudience } from "@/lib/audience.functions";
import { AppShell } from "@/components/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/audience")({
  head: () => ({
    meta: [
      { title: "Audience — Agent Nexus (agentnexus.app)" },
      {
        name: "description",
        content:
          "Who signed up, who signed in recently, and which agents called /mcp, /llms.txt and the public registry APIs.",
      },
      { property: "og:title", content: "Audience — Agent Nexus (agentnexus.app)" },
      {
        property: "og:description",
        content: "Members, sign-ins and machine traffic per entry point.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
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
    <section className="mt-6">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        {title}
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">{children}</div>
    </section>
  );
}

function PlanBadge({ plan }: { plan: "Free" | "Agent Pro" | "Publisher" }) {
  const tone =
    plan === "Publisher"
      ? "border-primary/50 text-primary"
      : plan === "Agent Pro"
        ? "border-accent/50 text-accent-foreground"
        : "border-border/60 text-muted-foreground";
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tone}`}
    >
      {plan}
    </span>
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
              <Stat label="MCP calls 24h" value={data.totals.mcpCalls24h} />
              <Stat label="MCP without key 24h" value={data.totals.anonMcpCalls24h} />
              <Stat label="MCP with key 24h" value={data.totals.keyedMcpCalls24h} />
              <Stat label="Calls 30d" value={data.totals.hits30d} />
              <Stat label="Distinct callers" value={data.totals.distinctCallers} />
            </div>

            <div className="mt-3 rounded-lg border border-border bg-card/60 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Total calls since launch
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
                {data.totals.hitsAllTime.toLocaleString("en-US")}
              </p>
              {data.totals.firstCallAt && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  since {new Date(data.totals.firstCallAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                </p>
              )}
            </div>

            <Tabs defaultValue="entry-points" className="mt-8">
              <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card/60">
                <TabsTrigger className="font-mono text-[11px] uppercase tracking-widest" value="entry-points">
                  Entry points
                </TabsTrigger>
                <TabsTrigger className="font-mono text-[11px] uppercase tracking-widest" value="members">
                  Members
                </TabsTrigger>
                <TabsTrigger className="font-mono text-[11px] uppercase tracking-widest" value="keys">
                  Keys
                </TabsTrigger>
                <TabsTrigger className="font-mono text-[11px] uppercase tracking-widest" value="top-callers">
                  Top callers
                </TabsTrigger>
                <TabsTrigger className="font-mono text-[11px] uppercase tracking-widest" value="mcp-activity">
                  MCP activity
                </TabsTrigger>
                <TabsTrigger className="font-mono text-[11px] uppercase tracking-widest" value="recent-calls">
                  Recent calls
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entry-points">
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
              </TabsContent>

              <TabsContent value="members">
            <Section
              title="Members"
              hint="Everyone who created an account, their plan, when they signed up and when they last signed in."
            >
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Plan</th>
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
                      <td className="px-3 py-2">
                        <PlanBadge plan={m.plan} />
                      </td>
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
              </TabsContent>

              <TabsContent value="keys">
            <Section
              title="API keys"
              hint="Every key ever issued. Agent keys are minted self-service by machines with no signup: no email, no dashboard, 1 000 calls/day. Account keys belong to a member."
            >
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Key</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Calls 30d</th>
                    <th className="px-3 py-2">Last call</th>
                    <th className="px-3 py-2">State</th>
                  </tr>
                </thead>
                <tbody>
                  {data.keys.length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-muted-foreground" colSpan={8}>
                        No key issued yet.
                      </td>
                    </tr>
                  )}
                  {data.keys.map((k) => (
                    <tr key={k.keyId} className="border-t border-border/40">
                      <td className="px-3 py-2">{k.prefix}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            k.kind === "agent"
                              ? "rounded border border-primary/40 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-primary"
                              : "rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground"
                          }
                        >
                          {k.kind === "agent" ? "Agent (no signup)" : "Account"}
                        </span>
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2">{k.label}</td>
                      <td className="px-3 py-2 text-muted-foreground">{k.owner ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{when(k.createdAt)}</td>
                      <td className="px-3 py-2">{k.calls}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {when(k.lastCallAt ?? k.lastUsedAt)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {k.revoked ? "revoked" : k.calls > 0 || k.lastUsedAt ? "active" : "unused"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
              </TabsContent>

              <TabsContent value="top-callers">
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
              </TabsContent>

              <TabsContent value="mcp-activity">
                <Section title="MCP without a key · last 24 hours" hint="Most active anonymous callers on the MCP endpoint. Counts include handshakes, not just searches; this is not quota usage or distinct people.">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-card/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <tr><th className="px-3 py-2">Caller</th><th className="px-3 py-2">Calls</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Last</th></tr>
                    </thead>
                    <tbody>
                      {data.topAnonMcp.length === 0 && <tr><td className="px-3 py-3 text-muted-foreground" colSpan={4}>No anonymous MCP calls in the last 24 hours.</td></tr>}
                      {data.topAnonMcp.map((c) => (
                        <tr key={c.actor} className="border-t border-border/40">
                          <td className="px-3 py-2 break-all">{c.actor}{c.country && <span className="ml-2 text-muted-foreground">{c.country}</span>}</td>
                          <td className="px-3 py-2">{c.hits.toLocaleString("en-US")}</td>
                          <td className="px-3 py-2 break-all text-muted-foreground">{c.userAgent || "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{when(c.lastSeen)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Section>
              </TabsContent>

              <TabsContent value="recent-calls">
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
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AppShell>
  );
}
