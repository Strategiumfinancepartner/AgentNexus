import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  submitEntry,
  listMySubmissions,
  getMyAccess,
  CATEGORIES,
  type Category,
} from "@/lib/registry.functions";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/submit")({
  head: () => ({
    meta: [
      { title: "Submit a surface — Agent Nexus" },
      {
        name: "description",
        content:
          "Submit an API, MCP server or CLI to the Agent Nexus registry. Every submission is reviewed before publication.",
      },
      { property: "og:title", content: "Submit a surface — Agent Nexus" },
      {
        property: "og:description",
        content: "Propose a callable surface for the agent infrastructure registry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubmitPage,
});

const field =
  "h-11 w-full rounded-lg border border-border bg-card/50 px-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary";

function SubmitPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const fetchMine = useServerFn(listMySubmissions);
  const create = useServerFn(submitEntry);

  const access = useQuery({ queryKey: ["access"], queryFn: () => fetchAccess() });
  const mine = useQuery({ queryKey: ["my-submissions"], queryFn: () => fetchMine() });

  const [form, setForm] = useState({
    name: "",
    category: "api" as Category,
    summary: "",
    description: "",
    auth_mode: "",
    endpoint: "",
    docs_url: "",
    tags: "",
    capabilities: "",
    auth_params: "",
    input_format: "",
    output_format: "",
    rate_limit: "",
    pricing: "",
    invocation_example: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          name: form.name,
          category: form.category,
          summary: form.summary,
          description: form.description,
          auth_mode: form.auth_mode,
          endpoint: form.endpoint,
          docs_url: form.docs_url,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 8),
          capabilities: form.capabilities
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length >= 2)
            .slice(0, 12),
          // "name:location" pairs, e.g. "Authorization:header, api_key:query"
          auth_params: form.auth_params
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .slice(0, 10)
            .map((p) => {
              const [name, location] = p.split(":").map((v) => v.trim());
              return { name: name ?? p, location: location || "header", required: true };
            })
            .filter((p) => p.name.length > 0),
          input_format: form.input_format,
          output_format: form.output_format,
          rate_limit: form.rate_limit,
          pricing: form.pricing,
          invocation_example: form.invocation_example,
        },
      }),
    onSuccess: () => {
      toast.success("Submitted — an admin will review it shortly.");
      setForm({
        name: "",
        category: "api",
        summary: "",
        description: "",
        auth_mode: "",
        endpoint: "",
        docs_url: "",
        tags: "",
        capabilities: "",
        auth_params: "",
        input_format: "",
        output_format: "",
        rate_limit: "",
        pricing: "",
        invocation_example: "",
      });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Submission failed"),
  });

  return (
    <AppShell isAdmin={access.data?.isAdmin ?? false}>
      <main className="pt-14 pb-20">
        <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
          Contribute
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight">Submit a surface</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Submissions land in the moderation queue. Once approved, the endpoint joins the
          health-check rotation.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-10 space-y-3"
        >
          <input
            className={field}
            required
            maxLength={80}
            placeholder="Name (e.g. Stripe)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex gap-1 rounded-full border border-border p-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, category: c })}
                className={`flex-1 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  form.category === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            className={field}
            required
            minLength={10}
            maxLength={300}
            placeholder="One-line summary (10–300 chars)"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
          <input
            className={field}
            required
            maxLength={500}
            placeholder="Endpoint or invocation (https://… or a command)"
            value={form.endpoint}
            onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
          />
          <input
            className={field}
            required
            maxLength={120}
            placeholder="Auth mode (Bearer key, OAuth 2.1, none…)"
            value={form.auth_mode}
            onChange={(e) => setForm({ ...form, auth_mode: e.target.value })}
          />
          <input
            className={field}
            type="url"
            maxLength={500}
            placeholder="Docs URL (optional)"
            value={form.docs_url}
            onChange={(e) => setForm({ ...form, docs_url: e.target.value })}
          />
          <input
            className={field}
            maxLength={200}
            placeholder="Tags, comma separated (max 8)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <div className="pt-4">
            <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
              Machine-actionable contract
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
              The more of this an agent gets, the less it needs a human to call the
              interface.
            </p>
          </div>
          <input
            className={field}
            maxLength={400}
            placeholder="Capabilities, comma separated (send-email, transcribe-audio…)"
            value={form.capabilities}
            onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
          />
          <input
            className={field}
            maxLength={300}
            placeholder="Auth params: name:location pairs (Authorization:header, key:query)"
            value={form.auth_params}
            onChange={(e) => setForm({ ...form, auth_params: e.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={field}
              maxLength={120}
              placeholder="Input format (application/json…)"
              value={form.input_format}
              onChange={(e) => setForm({ ...form, input_format: e.target.value })}
            />
            <input
              className={field}
              maxLength={120}
              placeholder="Output format (application/json…)"
              value={form.output_format}
              onChange={(e) => setForm({ ...form, output_format: e.target.value })}
            />
            <input
              className={field}
              maxLength={120}
              placeholder="Rate limit (100 req/s)"
              value={form.rate_limit}
              onChange={(e) => setForm({ ...form, rate_limit: e.target.value })}
            />
            <input
              className={field}
              maxLength={120}
              placeholder="Pricing (free, $0.001/call…)"
              value={form.pricing}
              onChange={(e) => setForm({ ...form, pricing: e.target.value })}
            />
          </div>
          <textarea
            className="min-h-20 w-full rounded-lg border border-border bg-card/50 p-3 font-mono text-xs outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
            maxLength={1000}
            placeholder={'Invocation example, e.g. curl -X POST https://api.example.com/v1/send -H "Authorization: Bearer $KEY"'}
            value={form.invocation_example}
            onChange={(e) => setForm({ ...form, invocation_example: e.target.value })}
          />
          <textarea
            className="min-h-28 w-full rounded-lg border border-border bg-card/50 p-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
            maxLength={4000}
            placeholder="Notes for agents: rate limits, pagination, idempotency… (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-11 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/registry" })}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>

        <section className="mt-14 border-t border-border/60 pt-8">
          <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
            Your submissions
          </h2>
          {mine.data?.length ? (
            <ul className="mt-4 divide-y divide-border/60">
              {mine.data.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground/60">
                      {e.endpoint}
                    </p>
                    {e.review_note && (
                      <p className="mt-1 text-xs text-muted-foreground">{e.review_note}</p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest ${
                      e.status === "approved"
                        ? "text-primary"
                        : e.status === "rejected"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 font-mono text-[11px] text-muted-foreground/70">
              nothing submitted yet
            </p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
