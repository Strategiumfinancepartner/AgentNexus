import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAlertSettings, saveAlertSettings, sendTestAlert } from "@/lib/publisher-alerts.functions";

const label = "font-mono text-[10px] uppercase tracking-widest text-muted-foreground";
const input = "mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";

export function PublisherAlertSettings({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getAlertSettings);
  const save = useServerFn(saveAlertSettings);
  const test = useServerFn(sendTestAlert);
  const q = useQuery({ queryKey: ["alert-settings", slug], queryFn: () => fetchSettings({ data: { slug } }) });
  const [form, setForm] = useState({ alert_outage: true, alert_schema: true, alert_data: true, stale_hours: 24, min_volume: "", email: "", webhook_url: "" });
  useEffect(() => {
    const s = q.data?.settings;
    if (s) setForm({ alert_outage: s.alert_outage, alert_schema: s.alert_schema, alert_data: s.alert_data, stale_hours: s.stale_hours, min_volume: s.min_volume == null ? "" : String(s.min_volume), email: s.email ?? "", webhook_url: s.webhook_url ?? "" });
  }, [q.data?.settings]);
  const saveM = useMutation({
    mutationFn: () => save({ data: { slug, alert_outage: form.alert_outage, alert_schema: form.alert_schema, alert_data: form.alert_data, stale_hours: Number(form.stale_hours), min_volume: form.min_volume === "" ? null : Number(form.min_volume), email: form.email.trim() || null, webhook_url: form.webhook_url.trim() || null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-settings", slug] }),
  });
  const testM = useMutation({ mutationFn: () => test({ data: { slug } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-settings", slug] }) });

  if (!q.data?.allowed) return null;
  const { publisher, canEdit, settings, history } = q.data;

  return (
    <section className="mt-6 rounded-xl border border-border bg-card/50 p-5">
      <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">Publisher alerts</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirmed outages (2 failed hourly checks in a row), response structure changes, stale data per source and low volume. Hourly checks can miss outages shorter than an hour.
      </p>
      {!publisher ? (
        <p className="mt-4 text-sm text-foreground">
          Available with the Publisher plan.{" "}
          <Link to="/pricing" search={{ plan: "publisher_monthly" } as never} className="underline underline-offset-4">See Publisher</Link>
        </p>
      ) : null}
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveM.mutate(); }}>
        <fieldset className="sm:col-span-2 flex flex-wrap gap-4 text-sm text-foreground" disabled={!canEdit}>
          {([["alert_outage", "Outage"], ["alert_schema", "Structure change"], ["alert_data", "Stale data & volume"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2">
              <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /> {l}
            </label>
          ))}
        </fieldset>
        <label className={label}>Source stale after (hours)
          <input className={input} type="number" min={1} max={720} value={form.stale_hours} disabled={!canEdit} onChange={(e) => setForm({ ...form, stale_hours: Number(e.target.value) })} />
        </label>
        <label className={label}>Minimum live records (optional)
          <input className={input} type="number" min={0} value={form.min_volume} disabled={!canEdit} onChange={(e) => setForm({ ...form, min_volume: e.target.value })} />
        </label>
        <label className={label}>Alert email (defaults to your account email)
          <input className={input} type="email" value={form.email} disabled={!canEdit} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className={label}>Webhook URL (https, optional)
          <input className={input} type="url" value={form.webhook_url} disabled={!canEdit} onChange={(e) => setForm({ ...form, webhook_url: e.target.value })} />
        </label>
        {settings?.webhook_secret ? (
          <p className="sm:col-span-2 font-mono text-[11px] text-muted-foreground break-all">
            Webhooks are signed: header x-agentnexus-signature = sha256=HMAC-SHA256(raw body) with secret {settings.webhook_secret}
          </p>
        ) : null}
        <div className="sm:col-span-2 flex flex-wrap gap-3">
          <button type="submit" disabled={!canEdit || saveM.isPending} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">Save alerts</button>
          <button type="button" disabled={!canEdit || !settings || testM.isPending} onClick={() => testM.mutate()} className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50">Send test alert</button>
          {saveM.isSuccess ? <span className="text-sm text-muted-foreground">Saved.</span> : null}
          {saveM.error ? <span className="text-sm text-destructive">{(saveM.error as Error).message}</span> : null}
          {testM.data ? <span className="text-sm text-muted-foreground">Test sent on {testM.data.sent}/{testM.data.total} channel(s).</span> : null}
          {testM.error ? <span className="text-sm text-destructive">{(testM.error as Error).message}</span> : null}
        </div>
      </form>
      {history.length ? (
        <div className="mt-6">
          <h3 className={label}>Last alerts</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {history.map((h, i) => (
              <li key={i} className="border-t border-border pt-2 text-foreground">
                <span className="font-mono text-[11px] text-muted-foreground">{new Date(h.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC · {h.channel} · {h.status}{h.attempts > 1 ? ` (${h.attempts} attempts)` : ""}</span>
                <div>{h.changes.join(" · ")}</div>
                {h.last_error && h.status !== "sent" ? <div className="text-[11px] text-destructive">{h.last_error}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
