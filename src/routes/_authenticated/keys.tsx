import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { listMyKeys, createApiKey, revokeApiKey } from "@/lib/keys.functions";

export const Route = createFileRoute("/_authenticated/keys")({
  head: () => ({
    meta: [
      { title: "API keys — Agent Nexus" },
      {
        name: "description",
        content:
          "Create a free Agent Nexus API key to raise your daily discovery quota, and track how many calls your agents made today.",
      },
      { property: "og:title", content: "API keys — Agent Nexus" },
      {
        property: "og:description",
        content: "Free keys raise the daily quota on the Agent Nexus discovery API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KeysPage,
});

function KeysPage() {
  const queryClient = useQueryClient();
  const fetchKeys = useServerFn(listMyKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => fetchKeys(),
  });

  const createMutation = useMutation({
    mutationFn: (keyName: string) => create({ data: { name: keyName || "default" } }),
    onSuccess: (result) => {
      setFreshKey(result.key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Key revoked");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => toast.error("Could not revoke that key."),
  });

  const active = (data?.keys ?? []).filter((k) => !k.revoked_at);
  const quota = data?.quota;

  return (
    <AppShell>
      <main className="pt-12 pb-24">
        <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">Access</p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight">API keys</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The discovery API is open without a key, capped at 100 calls a day per address. A
          free key raises that to 1,000 calls a day. Agent Pro raises it to 50,000.
        </p>

        {quota && (
          <div className="mt-8 flex flex-wrap gap-8 border-y border-border/60 py-5 font-mono text-[11px] uppercase tracking-widest">
            <span>
              <span className="text-muted-foreground">tier</span>{" "}
              <span className="text-primary">{quota.tier}</span>
            </span>
            <span>
              <span className="text-muted-foreground">today</span> {quota.usedToday} /{" "}
              {quota.limit.toLocaleString("en-US")}
            </span>
            <span>
              <span className="text-muted-foreground">resets</span> 00:00 utc
            </span>
          </div>
        )}

        <section className="mt-10">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate(name.trim());
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Key name (e.g. research-agent)"
              maxLength={60}
              className="h-11 w-full max-w-xs rounded-lg border border-border bg-card/50 px-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              {createMutation.isPending ? "Creating…" : "Create key →"}
            </button>
          </form>

          {freshKey && (
            <div className="mt-6 rounded-xl border border-primary/40 bg-primary/[0.05] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Copy it now — it is shown once
              </p>
              <code className="mt-3 block break-all font-mono text-xs">{freshKey}</code>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(freshKey);
                  toast.success("Copied");
                }}
                className="mt-3 font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-70"
              >
                Copy
              </button>
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
            Your keys
          </h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : active.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No active key yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {active.map((key) => (
                <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm">{key.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {key.key_prefix}…{" "}
                      {key.last_used_at
                        ? `last used ${new Date(key.last_used_at).toISOString().slice(0, 10)}`
                        : "never used"}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeMutation.mutate(key.id)}
                    disabled={revokeMutation.isPending}
                    className="font-mono text-[11px] uppercase tracking-widest text-destructive transition-opacity hover:opacity-70 disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-14 border-t border-border/60 pt-8">
          <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
            Using the key
          </h2>
          <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-card/40 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
{`curl -H "x-api-key: nx_…" \\
  "https://agentnexus.app/api/public/discover?need=send+a+transactional+email"`}
          </pre>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Every response carries your remaining quota in the{" "}
            <code className="font-mono">X-RateLimit-Remaining</code> header. Over quota, the API
            answers 429 with the exact limit and how to raise it.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
