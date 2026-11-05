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
  /** Sorted names of listed sources currently at zero live records; null when unknown. */
  zeroSources: string[] | null;
  /** Sorted names of sources whose count fell sharply since the previous check. */
  droppedSources: string[] | null;
  bySource: Record<string, number> | null;
  detail: string;
};

export const DEFAULT_SOURCE_DROP_PERCENT = 80;
export const MIN_COUNT_FOR_DROP = 50;
export type DataQualityOptions = { sourceLastUpdated?: unknown; staleHours?: number; minLive?: number; sources?: unknown; bySource?: unknown; previousBySource?: unknown; dropPercent?: number };

/** Per-source live counts; listed sources missing from the counts are treated as zero. */
export function sourceCountsOf(sources: unknown, bySource: unknown): Record<string, number> | null {
  if (!bySource || typeof bySource !== "object" || Array.isArray(bySource)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(bySource as Record<string, unknown>)) out[k] = typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
  if (Array.isArray(sources)) for (const s of sources) if (typeof s === "string" && !(s in out)) out[s] = 0;
  return Object.keys(out).length ? out : null;
}

export function zeroSourcesOf(counts: Record<string, number> | null): string[] | null {
  return counts ? Object.keys(counts).filter((k) => counts[k] === 0).sort() : null;
}

/** Sources that held at least MIN_COUNT_FOR_DROP records last check and lost more than dropPercent (excluding drops to zero, reported separately). */
export function droppedSourcesOf(prev: unknown, counts: Record<string, number> | null, dropPercent: number): string[] | null {
  if (!counts || !prev || typeof prev !== "object" || Array.isArray(prev)) return counts ? [] : null;
  const p = prev as Record<string, unknown>;
  return Object.keys(counts).filter((k) => {
    const before = p[k];
    return typeof before === "number" && before >= MIN_COUNT_FOR_DROP && (counts[k] ?? 0) > 0 && (counts[k] ?? 0) < before * (1 - dropPercent / 100);
  }).sort();
}

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
  const dropPercent = opts.dropPercent ?? DEFAULT_SOURCE_DROP_PERCENT;
  const counts = sourceCountsOf(opts.sources, opts.bySource);
  const zero = zeroSourcesOf(counts);
  const dropped = droppedSourcesOf(opts.previousBySource, counts, dropPercent);
  return {
    fresh, volume, staleSources: src ? src.stale : null, sourceCount: src ? src.total : counts ? Object.keys(counts).length : null,
    zeroSources: zero, droppedSources: dropped, bySource: counts,
    detail: JSON.stringify({ kind: "data-quality", fresh, volume, generated_at: validTime ? generatedAt : null, count_live: validCount ? countLive : null, max_age_seconds: NOVA_MAX_AGE_SECONDS, minimum_live: minLive, source_stale_hours: staleHours, sources_total: src?.total ?? null, stale_sources: src?.stale ?? null, zero_sources: zero, dropped_sources: dropped, source_drop_percent: dropPercent, by_source: counts }),
  };
}

export function previousCountsOf(detail: unknown): Record<string, number> | null {
  try { const d = JSON.parse(typeof detail === "string" ? detail : "null"); return d?.kind === "data-quality" && d.by_source && typeof d.by_source === "object" ? d.by_source : null; } catch { return null; }
}

export function readDataQuality(detail: unknown): Pick<DataQuality, "fresh" | "volume"> | undefined {
  try {
    const d = JSON.parse(typeof detail === "string" ? detail : "null");
    if (d?.kind !== "data-quality") return undefined;
    return { fresh: typeof d.fresh === "boolean" ? d.fresh : null, volume: typeof d.volume === "boolean" ? d.volume : null };
  } catch { return undefined; }
}
