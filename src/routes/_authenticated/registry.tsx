import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listEntries,
  getMyAccess,
  listVotes,
  toggleVote,
  CATEGORIES,
  type Category,
} from "@/lib/registry.functions";
import { VoteButton } from "@/components/vote-button";
import { AppShell, HealthBadge } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/registry")({
  head: () => ({
    meta: [
      { title: "Registry — Agent Nexus" },
      {
        name: "description",
        content:
          "Search the Agent Nexus registry: APIs, MCP servers and CLIs that AI agents can call, with health status.",
      },
      { property: "og:title", content: "Registry — Agent Nexus" },
      {
        property: "og:description",
        content: "Callable surfaces for AI agents, verified and searchable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegistryPage,
});

const FILTERS = ["all", ...CATEGORIES] as const;

function RegistryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const fetchEntries = useServerFn(listEntries);
  const fetchAccess = useServerFn(getMyAccess);
  const fetchVotes = useServerFn(listVotes);
  const vote = useServerFn(toggleVote);
  const queryClient = useQueryClient();

  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const entries = useQuery({
    queryKey: ["entries", search, category],
    queryFn: () => fetchEntries({ data: { search, category } }),
  });

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
      <main className="pb-20">
        <section className="pt-14 pb-8">
          <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
            Callable surfaces
          </p>
          <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Registry</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Every entry is reviewed before it lands here and its endpoint is probed
            regularly. Freshness is the product.
          </p>
          <p className="mt-5 font-mono text-[11px] tracking-widest uppercase text-muted-foreground/70">
            your reputation · {access.data?.reputation.approvedEntries ?? 0} approved ·{" "}
            {access.data?.reputation.votesReceived ?? 0} votes received
            {access.data?.isModerator && !access.data?.isAdmin ? " · moderator" : ""}
          </p>
        </section>

        <section className="sticky top-[57px] z-[5] -mx-6 bg-background/80 px-6 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, endpoint, summary…"
              className="h-10 min-w-0 flex-1 rounded-full border border-border bg-card/50 px-4 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <div className="flex gap-1 rounded-full border border-border p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setCategory(f)}
                  className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                    category === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4">
          {entries.isPending && (
            <p className="py-10 text-center font-mono text-xs text-muted-foreground">
              loading registry…
            </p>
          )}
          {entries.isError && (
            <p className="py-10 text-center font-mono text-xs text-destructive">
              The registry could not be loaded. Try again.
            </p>
          )}
          {entries.data?.length === 0 && (
            <p className="py-10 text-center font-mono text-xs text-muted-foreground">
              no matching surface
            </p>
          )}

          <ul className="space-y-2">
            {entries.data?.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <VoteButton
                  count={votes.data?.votes[e.id] ?? 0}
                  voted={votes.data?.mine.includes(e.id) ?? false}
                  disabled={voteMutation.isPending}
                  onClick={() => voteMutation.mutate(e.id)}
                />
                <Link
                  to="/entry/$slug"
                  params={{ slug: e.slug }}
                  className="group block min-w-0 flex-1 rounded-xl border border-transparent px-4 py-5 transition-colors hover:border-border hover:bg-card/60"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="w-9 shrink-0 font-mono text-[10px] uppercase tracking-widest text-primary/80">
                      {e.category}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <p className="text-sm font-medium">{e.name}</p>
                        <HealthBadge ok={e.health_ok} checkedAt={e.health_checked_at} />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {e.summary}
                      </p>
                      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground/60 transition-colors group-hover:text-primary/70">
                        {e.endpoint}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
