/**
 * Publisher-plan alerts: confirmed outage, schema change and data quality
 * (global freshness, volume, per-source staleness), with publisher settings.
 * Only entries whose submitter holds a live Publisher subscription fire.
 */
import { deliver } from "./alert-delivery.server";
import { describePublisherChange, publisherState } from "./publisher-alerts";
import { NOVA_MIN_LIVE } from "./data-quality";

type Admin = { from: (t: string) => any; auth?: any };

export async function isLivePublisher(admin: Admin, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { publisherUserIds } = await import("./publisher-entitlements.server");
  return (await publisherUserIds(admin as never)).has(userId);
}

export function snapshotFromEntry(e: { down_since: string | null; health_checked_at?: string | null; schema_ok: boolean | null; data_detail: string | null }) {
  let d: any = null;
  try { d = JSON.parse(e.data_detail ?? "null"); } catch { d = null; }
  const data = d?.kind === "data-quality" ? d : null;
  return {
    up: e.health_checked_at === null ? null : e.down_since ? false : true,
    schema: e.schema_ok,
    fresh: data ? data.fresh ?? null : null,
    volume: data ? data.volume ?? null : null,
    stale: data && Array.isArray(data.stale_sources) ? data.stale_sources as string[] : null,
    sourcesTotal: data ? data.sources_total ?? null : null,
    zero: data && Array.isArray(data.zero_sources) ? data.zero_sources as string[] : null,
    dropped: data && Array.isArray(data.dropped_sources) ? data.dropped_sources as string[] : null,
  };
}

async function recipientEmail(admin: Admin, settingsEmail: string | null, submitter: string | null): Promise<string | null> {
  if (settingsEmail) return settingsEmail;
  if (!submitter) return null;
  try { const { data } = await admin.auth.admin.getUserById(submitter); return data?.user?.email ?? null; } catch { return null; }
}

export async function sendPublisherAlert(admin: Admin, entry: { id: string; slug: string; name: string; submitted_by: string | null }, settings: any, changes: string[], state: string, test = false, fallbackEmail: string | null = null) {
  const entryUrl = `https://agentnexus.app/registry/${entry.slug}`;
  const payload = { event: test ? "publisher.test" : "publisher.alert", slug: entry.slug, name: entry.name, changes, state, entry_url: entryUrl, health_card: `https://agentnexus.app/api/public/health-card/${entry.slug}`, observed_at: new Date().toISOString() };
  const results: boolean[] = [];
  if (settings.webhook_url) results.push(await deliver(admin, { entryId: entry.id, audience: "publisher", channel: "webhook", target: settings.webhook_url, secret: settings.webhook_secret, payload }));
  const email = (await recipientEmail(admin, settings.email, entry.submitted_by)) ?? fallbackEmail;
  if (email) results.push(await deliver(admin, { entryId: entry.id, audience: "publisher", channel: "email", target: email, payload: {
    template: "tool-change-alert", idempotencyKey: `pub:${entry.id}:${test ? Date.now() : state}`,
    templateData: { entryName: entry.name, changes, entryUrl, unsubscribeUrl: `https://agentnexus.app/entry/${entry.slug}` },
  } }));
  return results;
}

/** Call after any probe that updated the entry. Never throws. */
export async function notifyPublisher(admin: Admin, entryId: string): Promise<void> {
  try {
    const { data: settings } = await admin.from("entry_alert_settings").select("*").eq("entry_id", entryId).maybeSingle();
    if (!settings) return;
    const { data: entry } = await admin.from("entries").select("id, slug, name, submitted_by, down_since, health_checked_at, schema_ok, data_detail").eq("id", entryId).maybeSingle();
    if (!entry?.submitted_by || !(await isLivePublisher(admin, entry.submitted_by))) return;
    const kinds = { outage: settings.alert_outage, schema: settings.alert_schema, data: settings.alert_data };
    const state = publisherState(snapshotFromEntry(entry), kinds);
    if (settings.last_state === state) return;
    if (settings.last_state) {
      const changes = describePublisherChange(settings.last_state, state, { minVolume: settings.min_volume ?? NOVA_MIN_LIVE, staleHours: settings.stale_hours, dropPercent: settings.drop_percent ?? undefined });
      if (changes.length) await sendPublisherAlert(admin, entry, settings, changes, state);
    }
    await admin.from("entry_alert_settings").update({ last_state: state }).eq("entry_id", entryId);
  } catch (error) {
    console.error("notifyPublisher failed", error);
  }
}
