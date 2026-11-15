/** Max failed services pulled to the front of one hourly cycle. */
export const FAILED_RECHECK_MAX = 20;

/** Failed services first, then the normal oldest-first rotation, deduped, capped at limit. */
export function mergeRecheckQueue<T extends { id: string }>(failing: T[], rotation: T[], limit: number): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of [...failing.slice(0, FAILED_RECHECK_MAX), ...rotation]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id); out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
