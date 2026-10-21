export const NOVA_SLUG = "remote-jobs-api-api-nfpe";
export const NOVA_MAX_AGE_SECONDS = 6 * 60 * 60;
export const NOVA_MIN_LIVE = 100000;
export type DataQuality = { fresh: boolean | null; volume: boolean | null; detail: string };

export function assessNovaData(generatedAt: unknown, countLive: unknown, nowSeconds: number): DataQuality {
  const validTime = typeof generatedAt === "number" && Number.isFinite(generatedAt) && generatedAt > 0 && generatedAt <= nowSeconds + 300;
  const validCount = typeof countLive === "number" && Number.isFinite(countLive) && countLive >= 0;
  const fresh = validTime ? nowSeconds - generatedAt <= NOVA_MAX_AGE_SECONDS : null;
  const volume = validCount ? countLive >= NOVA_MIN_LIVE : null;
  return { fresh, volume, detail: JSON.stringify({ kind: "data-quality", fresh, volume, generated_at: validTime ? generatedAt : null, count_live: validCount ? countLive : null, max_age_seconds: NOVA_MAX_AGE_SECONDS, minimum_live: NOVA_MIN_LIVE }) };
}

export function readDataQuality(detail: unknown): Pick<DataQuality, "fresh" | "volume"> | undefined {
  try {
    const d = JSON.parse(typeof detail === "string" ? detail : "null");
    if (d?.kind !== "data-quality") return undefined;
    return { fresh: typeof d.fresh === "boolean" ? d.fresh : null, volume: typeof d.volume === "boolean" ? d.volume : null };
  } catch { return undefined; }
}