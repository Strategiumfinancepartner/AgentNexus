import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listModerationQueue,
  moderateEntry,
  getMyAccess,
  runHealthChecksNow,
} from "@/lib/registry.functions";
import type { Entry } from "@/lib/registry.functions";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Moderation — Agent Nexus" },
      {
        name: "description",
        content:
          "Review pending registry submissions and approve or reject the callable surfaces exposed to agents.",
      },
      { property: "og:title", content: "Moderation — Agent Nexus" },
      {
        property: "og:description",
        content: "Approve or reject pending registry submissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const fetchPending = useServerFn(listModerationQueue);
  const moderate = useServerFn(moderateEntry);
  const runChecks = useServerFn(runHealthChecksNow);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const pending = useQuery({
    queryKey: ["pending"],
    queryFn: () => fetchPending(),
    enabled: access.data?.isAdmin === true,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: "approved" | "rejected" }) =>
      moderate({
        data: {
          id: vars.id,
          decision: vars.status,
          note: notes[vars.id] ?? "",
        },
      }),
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "approved" ? "Entry approved" : "Entry rejected");
      queryClient.invalidateQueries({ queryKey: ["pending"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Moderation failed"),
  });

  const healthMutation = useMutation({
    mutationFn: () => runChecks(),
    onSuccess: (result) => {
      toast.success(
        `Health checks done — ${result.ok} up, ${result.failed} down, ${result.skipped} skipped`,
      );
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["entry"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Health checks failed"),
  });

  return (
    <AppShell isAdmin={access.data?.isAdmin ?? false}>
      <main className="pt-14 pb-20">
        <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
          Trust layer
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight">Moderation queue</h1>

        {access.isSuccess && !access.data.isAdmin && (
          <p className="mt-8 font-mono text-xs text-muted-foreground">
            Your account does not have review permissions.
          </p>
        )}

        {access.data?.isAdmin && (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-border p-5">
              <div className="mr-auto">
                <p className="text-sm font-medium">Endpoint health</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
                  Probes approved HTTP endpoints and stores latency + status.
                </p>
              </div>
              <button
                disabled={healthMutation.isPending}
                onClick={() => healthMutation.mutate()}
                className="h-9 rounded-full border border-border px-5 text-xs font-medium transition-colors hover:text-foreground disabled:opacity-50"
              >
                {healthMutation.isPending ? "Running…" : "Run health checks"}
              </button>
            </div>

            {pending.isPending && (
              <p className="mt-8 font-mono text-xs text-muted-foreground">loading queue…</p>
            )}
            {pending.data?.length === 0 && (
              <p className="mt-8 font-mono text-xs text-muted-foreground">queue is empty</p>
            )}
            <ul className="mt-8 space-y-4">
              {pending.data?.map((e: Entry) => (
                <li key={e.id} className="rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{e.name}</p>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary/80">
                      {e.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {e.summary}
                  </p>
                  <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground/60">
                    {e.endpoint}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground/60">
                    auth: {e.auth_mode}
                  </p>
                  <input
                    className="mt-4 h-10 w-full rounded-lg border border-border bg-card/50 px-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
                    placeholder="Review note (optional, shared with the author)"
                    maxLength={500}
                    value={notes[e.id] ?? ""}
                    onChange={(ev) => setNotes({ ...notes, [e.id]: ev.target.value })}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ id: e.id, status: "approved" })}
                      className="h-9 rounded-full bg-primary px-5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ id: e.id, status: "rejected" })}
                      className="h-9 rounded-full border border-border px-5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </AppShell>
  );
}
