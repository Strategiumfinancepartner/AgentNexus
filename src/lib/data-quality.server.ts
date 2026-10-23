import { assessNovaData, NOVA_SLUG, type DataQuality } from "./data-quality";
import { notifyWatchers } from "./watch.server";

async function readPayload(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://remote-jobs-api.tten.no${path}`, {
    redirect: "manual", signal: AbortSignal.timeout(10000),
    headers: { accept: "application/json", "user-agent": "AgentNexus-DataProbe/1.0" },
  });
  if (!response.ok) throw new Error(`Nova data probe HTTP ${response.status}`);
  return await response.json() as Record<string, unknown>;
}

export async function probeNovaData(): Promise<DataQuality> {
  const once = async () => {
    const [jobs, health] = await Promise.allSettled([readPayload("/v1/jobs?limit=1"), readPayload("/health")]);
    return assessNovaData(jobs.status === "fulfilled" ? jobs.value['generated_at'] : null,
      health.status === "fulfilled" ? health.value['count_live'] : null, Date.now() / 1000);
  };
  const first = await once();
  if (first.fresh === true && first.volume === true) return first;
  await new Promise((resolve) => setTimeout(resolve, 10000));
  return once();
}

/** Pinned publisher checks run every scheduler cycle, independently of catalog rotation. */
export async function runDataQualityChecks(admin: { from: (table: string) => any }) {
  const { data: entry, error } = await admin.from("entries")
    .select("id, slug, name, health_ok, discovered_tools").eq("slug", NOVA_SLUG).eq("status", "approved").maybeSingle();
  if (error) throw new Error(error.message);
  if (!entry) return { checked: 0 };
  const quality = await probeNovaData();
  const ok = quality.fresh === false || quality.volume === false ? false : quality.fresh === true && quality.volume === true ? true : null;
  const { error: saveError } = await admin.from("entries").update({ schema_ok: ok, schema_detail: quality.detail, schema_checked_at: new Date().toISOString() }).eq("id", entry.id);
  if (saveError) throw new Error(saveError.message);
  await notifyWatchers(admin, entry, { up: entry.health_ok, schema_ok: ok, tools: entry.discovered_tools, ...quality });
  return { checked: 1, ok, ...quality };
}