/** Publisher alert state and change wording. Pure and browser-safe. */
export type PublisherSnapshot = {
  up: boolean | null; // confirmed liveness (2 failed probes in a row = down)
  schema: boolean | null;
  fresh?: boolean | null;
  volume?: boolean | null;
  stale?: string[] | null;
  sourcesTotal?: number | null;
};
export type PublisherKinds = { outage: boolean; schema: boolean; data: boolean };

export function publisherState(s: PublisherSnapshot, k: PublisherKinds): string {
  const parts: string[] = [];
  if (k.outage) parts.push(`up=${s.up ?? "?"}`);
  if (k.schema) parts.push(`schema=${s.schema ?? "?"}`);
  if (k.data) {
    parts.push(`fresh=${s.fresh ?? "?"}`, `volume=${s.volume ?? "?"}`);
    parts.push(`stale=${s.stale ? s.stale.join(",") : "?"}`);
    parts.push(`total=${s.sourcesTotal ?? "?"}`);
  }
  return parts.join(";");
}

type Parsed = Partial<Record<"up" | "schema" | "fresh" | "volume" | "stale" | "total", string>>;
function parse(state: string): Parsed {
  return Object.fromEntries(state.split(";").filter(Boolean).map((x) => { const i = x.indexOf("="); return [x.slice(0, i), x.slice(i + 1)]; })) as Parsed;
}

export function describePublisherChange(prev: string, next: string, opts: { minVolume: number; staleHours: number; downSince?: string | null } ): string[] {
  const p = parse(prev), n = parse(next), out: string[] = [];
  if ("up" in n && p.up !== n.up) {
    if (n.up === "false") out.push("OUTAGE: confirmed down (2 consecutive failed checks)");
    else if (n.up === "true" && p.up === "false") out.push("RECOVERED: answering again");
  }
  if ("schema" in n && p.schema !== n.schema) {
    if (n.schema === "false") out.push("SCHEMA CHANGE: response no longer matches its documented structure");
    else if (n.schema === "true" && p.schema === "false") out.push("SCHEMA OK: response matches its structure again");
  }
  if ("fresh" in n && p.fresh !== n.fresh) {
    if (n.fresh === "false") out.push("STALE DATA: global dataset older than 6 hours");
    else if (n.fresh === "true" && p.fresh === "false") out.push("FRESH AGAIN: global dataset updated within 6 hours");
  }
  if ("volume" in n && p.volume !== n.volume) {
    if (n.volume === "false") out.push(`LOW VOLUME: live records below ${opts.minVolume.toLocaleString("en-US")}`);
    else if (n.volume === "true" && p.volume === "false") out.push(`VOLUME OK: live records back above ${opts.minVolume.toLocaleString("en-US")}`);
  }
  if ("stale" in n && p.stale !== n.stale && n.stale !== "?") {
    const before = new Set(p.stale && p.stale !== "?" ? p.stale.split(",").filter(Boolean) : []);
    const now = (n.stale ?? "").split(",").filter(Boolean);
    const added = now.filter((x) => !before.has(x));
    const recovered = [...before].filter((x) => !now.includes(x));
    const total = n.total && n.total !== "?" ? ` of ${n.total}` : "";
    if (added.length) out.push(`STALE SOURCES: ${now.length}${total} sources not updated for ${opts.staleHours}h+ (new: ${added.join(", ")})`);
    if (recovered.length) out.push(`SOURCES RECOVERED: ${recovered.join(", ")}`);
  }
  return out;
}
