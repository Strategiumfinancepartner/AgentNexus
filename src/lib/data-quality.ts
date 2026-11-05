export const NOVA_SLUG = "remote-jobs-api-api-nfpe";
export const NOVA_MAX_AGE_SECONDS = 6 * 60 * 60;
export const NOVA_MIN_LIVE = 100000;
export const DEFAULT_SOURCE_STALE_HOURS = 24;
export type DataQuality = {
  fresh: boolean | null;
  volume: boolean | null;
  /** Sorted names of sources whose last update is older than the threshold; null when unknown. */
  staleSources: string[] | null;
  sourceCount: number | null;
  detail: string;
};

export type DataQualityOptions = { sourceLastUpdated?: unknown; staleHours?: number; minLive?: number };

function toSeconds(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t / 1000 : null; }
  return null;
}

export function staleSourcesOf(map: unknown, nowSeconds: number, staleHours: number): { stale: string[]; total: number } | null {
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const entries = Object.entries(map as Record<string, unknown>);
  if (!entries.length) return null;
  const limit = staleHours * 3600;
  const stale = entries.filter(([, v]) => { const s = toSeconds(v); return s === null || nowSeconds - s > limit; }).map(([k]) => k).sort();
  return { stale, total: entries.length };
}

export function assessNovaData(generatedAt: unknown, countLive: unknown, nowSeconds: number, opts: DataQualityOptions = {}): DataQuality {
  const minLive = opts.minLive ?? NOVA_MIN_LIVE;
  const staleHours = opts.staleHours ?? DEFAULT_SOURCE_STALE_HOURS;
  const validTime = typeof generatedAt === "number" && Number.isFinite(generatedAt) && generatedAt > 0 && generatedAt <= nowSeconds + 300;
  const validCount = typeof countLive === "number" && Number.isFinite(countLive) && countLive >= 0;
  const fresh = validTime ? nowSeconds - generatedAt <= NOVA_MAX_AGE_SECONDS : null;
  const volume = validCount ? countLive >= minLive : null;
  const src = staleSourcesOf(opts.sourceLastUpdated, nowSeconds, staleHours);
  return {
    fresh, volume, staleSources: src ? src.stale : null, sourceCount: src ? src.total : null,
    detail: JSON.stringify({ kind: "data-quality", fresh, volume, generated_at: validTime ? generatedAt : null, count_live: validCount ? countLive : null, max_age_seconds: NOVA_MAX_AGE_SECONDS, minimum_live: minLive, source_stale_hours: staleHours, sources_total: src?.total ?? null, stale_sources: src?.stale ?? null }),
  };
}

export function readDataQuality(detail: unknown): Pick<DataQuality, "fresh" | "volume"> | undefined {
  try {
    const d = JSON.parse(typeof detail === "string" ? detail : "null");
    if (d?.kind !== "data-quality") return undefined;
    return { fresh: typeof d.fresh === "boolean" ? d.fresh : null, volume: typeof d.volume === "boolean" ? d.volume : null };
  } catch { return undefined; }
}
