import { assessNovaData, previousCountsOf, NOVA_SLUG, type DataQuality, type DataQualityOptions } from "./data-quality";
import { notifyWatchers } from "./watch.server";

async function readPayload(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://remote-jobs-api.tten.no${path}`, {
    redirect: "manual", signal: AbortSignal.timeout(10000),
    headers: { accept: "application/json", "user-agent": "AgentNexus-DataProbe/1.0" },
  });
  if (!response.ok) throw new Error(`Nova data probe HTTP ${response.status}`);
  return await response.json() as Record<string, unknown>;
}

export async function probeNovaData(opts: Omit<DataQualityOptions, "sourceLastUpdated" | "sources" | "bySource"> = {}): Promise<DataQuality> {
  const once = async () => {
    const [jobs, health] = await Promise.allSettled([readPayload("/v1/jobs?limit=1"), readPayload("/health")]);
    const h = health.status === "fulfilled" ? health.value : null;
    return assessNovaData(jobs.status === "fulfilled" ? jobs.value['generated_at'] : null,
      h ? h['count_live'] : null, Date.now() / 1000, { ...opts, sourceLastUpdated: h ? h['source_last_updated'] : undefined, sources: h ? h['sources'] : undefined, bySource: h ? h['by_source'] : undefined });
  };
  const first = await once();
  if (first.fresh === true && first.volume === true && first.staleSources !== null && first.zeroSources !== null && first.zeroSources.length === 0 && (first.droppedSources?.length ?? 0) === 0) return first;
  await new Promise((resolve) => setTimeout(resolve, 10000));
  return once();
}

/** Pinned publisher checks run every scheduler cycle, independently of catalog rotation.
 *  Results live in data_* columns, separate from the response-schema check. */
export async function runDataQualityChecks(admin: { from: (table: string) => any }) {
  const { data: entry, error } = await admin.from("entries")
    .select("id, slug, name, health_ok, down_since, schema_ok, discovered_tools, data_detail").eq("slug", NOVA_SLUG).eq("status", "approved").maybeSingle();
  if (error) throw new Error(error.message);
  if (!entry) return { checked: 0 };
  const { data: settings } = await admin.from("entry_alert_settings").select("stale_hours, min_volume, drop_percent").eq("entry_id", entry.id).maybeSingle();
  const quality = await probeNovaData({ staleHours: settings?.stale_hours ?? undefined, minLive: settings?.min_volume ?? undefined, dropPercent: settings?.drop_percent ?? undefined, previousBySource: previousCountsOf(entry.data_detail) });
  const ok = quality.fresh === false || quality.volume === false ? false : quality.fresh === true && quality.volume === true ? true : null;
  const { error: saveError } = await admin.from("entries").update({ data_ok: ok, data_detail: quality.detail, data_checked_at: new Date().toISOString() }).eq("id", entry.id);
  if (saveError) throw new Error(saveError.message);
  await notifyWatchers(admin, entry, { up: entry.down_since ? false : entry.health_ok === null ? null : true, schema_ok: entry.schema_ok, tools: entry.discovered_tools, fresh: quality.fresh, volume: quality.volume });
  const { notifyPublisher } = await import("./publisher-alerts.server");
  await notifyPublisher(admin, entry.id);
  return { checked: 1, ok, fresh: quality.fresh, volume: quality.volume, stale_sources: quality.staleSources?.length ?? null, sources_total: quality.sourceCount, zero_sources: quality.zeroSources, dropped_sources: quality.droppedSources };
}
