import { useState } from "react";

export function FollowTool({ slug, name }: { slug: string; name: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/public/watch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = await res.json();
      setMsg(res.ok ? `Done. We'll email you when ${name} changes.` : data.error ?? "Something went wrong.");
    } catch {
      setMsg("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Follow this tool</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Get an alert when {name} goes down, comes back, or quietly changes shape (response schema or tool list).
        Free for up to 3 tools. Pro: 100 tools + webhooks for your agents.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "…" : "Follow"}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </section>
  );
}
