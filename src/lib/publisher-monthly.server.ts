/**
 * Monthly publisher reports, run from the hourly cycle. Safeguards:
 * - only on the 1st of the month (UTC), covering the previous month;
 * - one report per entry per month (checked in watch_deliveries + email idempotency key);
 * - paying publishers always; non-paying only when ops_config monthly_reports_free = "on";
 * - at most MAX_PER_RUN sends per hourly cycle, the rest continue next hour.
 */
import { buildEntryReport } from "./entry-report";
import { buildMonthlyReport, monthlyIdempotencyKey, previousMonth } from "./publisher-monthly";
import { deliver } from "./alert-delivery.server";

type Admin = { from: (t: string) => any; auth?: any };
const MAX_PER_RUN = 25;

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return { start: new Date(Date.UTC(y, m - 1, 1)).toISOString(), end: new Date(Date.UTC(y, m, 1)).toISOString(), days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

export async function runMonthlyReports(admin: Admin, now = new Date(), opts: { force?: boolean; onlySlug?: string; dryRun?: boolean } = {}) {
  if (!opts.force && now.getUTCDate() !== 1) return { skipped: "not the 1st" };
  const month = previousMonth(now);
  const { start, end, days } = monthBounds(month);
  const { data: flag } = await admin.from("ops_config").select("value").eq("key", "monthly_reports_free").maybeSingle();
  const freeEnabled = flag?.value === "on";
  const { publisherUserIds } = await import("./publisher-entitlements.server");
  const payingUsers = await publisherUserIds(admin as never);

  let q = admin.from("entries").select("id, slug, name, submitted_by").eq("status", "approved").not("submitted_by", "is", null).limit(2000);
  if (opts.onlySlug) q = q.eq("slug", opts.onlySlug);
  const { data: entries } = await q;
  let sent = 0, skipped = 0;
  const previews: unknown[] = [];
  for (const e of (entries ?? []) as any[]) {
    if (sent >= MAX_PER_RUN) break;
    const paying = payingUsers.has(e.submitted_by);
    if (!paying && !freeEnabled && !opts.dryRun) { skipped++; continue; }
    const key = monthlyIdempotencyKey(e.id, month);
    const { data: dup } = await admin.from("watch_deliveries").select("id").eq("entry_id", e.id).eq("payload->>idempotencyKey", key).limit(1);
    if ((dup ?? []).length > 0) { skipped++; continue; }

    let email: string | null = null;
    try { const { data } = await admin.auth.admin.getUserById(e.submitted_by); email = data?.user?.email ?? null; } catch { email = null; }
    const { data: settings } = await admin.from("entry_alert_settings").select("email").eq("entry_id", e.id).maybeSingle();
    email = settings?.email ?? email;
    if (!email) { skipped++; continue; }

    const opens: any[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data: page } = await admin.from("access_events").select("actor, user_agent, created_at")
        .gte("created_at", start).lt("created_at", end)
        .or(`path.eq./api/public/registry/${e.slug},path.like.*get_entry?slug=${e.slug}`).range(from, from + 999);
      opens.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const [{ data: apps }, { data: checks }, { count: reports }] = await Promise.all([
      admin.from("entry_appearances").select("source, created_at").eq("entry_slug", e.slug).gte("created_at", start).lt("created_at", end).limit(20000),
      admin.from("health_checks").select("ok, status_code, error, checked_at").eq("entry_id", e.id).gte("checked_at", start).lt("checked_at", end).limit(5000),
      admin.from("invocation_reports").select("id", { count: "exact", head: true }).eq("entry_id", e.id).eq("outcome", "success").gte("created_at", start).lt("created_at", end),
    ]);
    const c = (checks ?? []) as any[];
    const report = buildMonthlyReport({
      entryName: e.name, slug: e.slug, month, paying,
      report: buildEntryReport(opens, apps ?? [], days),
      successReports: reports ?? 0,
      checks: c.length, checksOk: c.filter((x) => x.ok).length,
      incidents: c.filter((x) => !x.ok).map((x) => ({ at: String(x.checked_at).slice(0, 16).replace("T", " "), detail: x.error || `HTTP ${x.status_code ?? "?"}` })),
    });
    if (opts.dryRun) { previews.push({ slug: e.slug, email, report }); continue; }
    await deliver(admin, { entryId: e.id, audience: "publisher", channel: "email", target: email, payload: {
      kind: "monthly", template: "publisher-monthly-report", idempotencyKey: key, templateData: report,
    } });
    sent++;
  }
  return { month, sent, skipped, freeEnabled, ...(opts.dryRun ? { previews } : {}) };
}
