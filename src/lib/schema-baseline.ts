import { diffToolSchemas, type ToolSchema } from "@/lib/capability-probe.server";

// Schema drift is compared per subject (endpoint + negotiated protocol version),
// and a new shape must be seen on 2 consecutive probes before it counts as drift.
// Why: behind a load balancer during a rolling deploy, probes alternate between
// old and new nodes; naive cycle-to-cycle diffs would report phantom drift.

type Schemas = Record<string, ToolSchema>;
export type SchemaState = {
  baselines: Record<string, Schemas>;
  pending?: { version: string; schemas: Schemas } | null;
  // Recent observations (24h window) used to tell a converging deploy from a split fleet.
  seen?: { at: string; version: string; hash: string }[];
};

export const FLEET_WINDOW_MS = 24 * 3600_000;
export const FLEET_MIN_SPAN_MS = 6 * 3600_000;

export type FleetView = {
  window_hours: 24;
  distinct_shapes_24h: number;
  observations_24h: number;
  complete_observations_24h: number;
  last_complete_at: string | null;
  verdict: "single_shape" | "converging" | "split_fleet";
};

// One shape = stable. Several shapes that keep alternating for 6h+ (an older shape
// reappears after a newer one) = split fleet behind one endpoint, not drift.
export function fleetView(state: SchemaState, version: string | null, nowMs: number): FleetView {
  const v = version ?? "unknown";
  // Only complete tools/list probes enter seen (the caller gates partial probes).
  const complete = (state.seen ?? []).filter((o) => o.version === v && Number.isFinite(Date.parse(o.at)) && Date.parse(o.at) <= nowMs)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const lastComplete = complete.at(-1);
  const obs = complete.filter((o) => nowMs - Date.parse(o.at) <= FLEET_WINDOW_MS);
  const distinct = new Set(obs.map((o) => o.hash)).size;
  let verdict: FleetView["verdict"] = distinct <= 1 ? "single_shape" : "converging";
  if (distinct >= 2) {
    const firstSeen = new Map<string, number>();
    let alternated = false;
    obs.forEach((o, i) => {
      if (!firstSeen.has(o.hash)) firstSeen.set(o.hash, i);
      else if (i > 0 && obs[i - 1]?.hash !== o.hash) alternated = true;
    });
    const first = obs[0];
    const last = obs.at(-1);
    const span = first && last ? Date.parse(last.at) - Date.parse(first.at) : 0;
    if (alternated && span >= FLEET_MIN_SPAN_MS) verdict = "split_fleet";
  }
  return { window_hours: 24, distinct_shapes_24h: distinct, observations_24h: obs.length, complete_observations_24h: obs.length, last_complete_at: lastComplete?.at ?? null, verdict };
}

// Recompute at read time: failed/partial probes do not refresh the stored subject.
// Missing legacy history is unknown, not a fabricated zero or a fresh timestamp.
export function comparisonSubjectView(stored: string | null, state: SchemaState | null, nowMs: number) {
  if (!stored) return null;
  try {
    const subject = JSON.parse(stored);
    if (!subject || typeof subject !== "object" || Array.isArray(subject)) return null;
    return {
      ...subject,
      fleet: state && Array.isArray(state.seen)
        ? fleetView(state, subject.protocol_version ?? null, nowMs)
        : subject.fleet ? { ...subject.fleet, complete_observations_24h: null, last_complete_at: null } : null,
    };
  } catch { return null; }
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

export function schemaSubject(endpoint: string, version: string | null, schemas: Schemas) {
  const v = version ?? "unknown";
  const toolUnion = Object.keys(schemas).sort();
  return { endpoint, protocol_version: v, tool_union: toolUnion, key: `${v}:${fnv(stable(toolUnion))}:${fnv(stable(schemas))}` };
}

export function advanceSchemaBaseline(
  prevState: SchemaState | null,
  legacySchemas: Schemas | null,
  version: string | null,
  schemas: Schemas,
  nowMs: number = Date.now(),
): { state: SchemaState; changes: string[]; status: "baseline" | "stable" | "pending_confirmation" | "confirmed_drift" } {
  const v = version ?? "unknown";
  const seen = [...(prevState?.seen ?? []), { at: new Date(nowMs).toISOString(), version: v, hash: fnv(stable(schemas)) }]
    .filter((o) => nowMs - Date.parse(o.at) <= FLEET_WINDOW_MS)
    .slice(-200);
  const state: SchemaState = { baselines: { ...(prevState?.baselines ?? {}) }, pending: prevState?.pending ?? null, seen };
  if (!prevState && legacySchemas && Object.keys(legacySchemas).length > 0) state.baselines[v] = legacySchemas;
  const base = state.baselines[v];
  if (!base) { state.baselines[v] = schemas; state.pending = null; return { state, changes: [], status: "baseline" }; }
  if (stable(base) === stable(schemas)) { state.pending = null; return { state, changes: [], status: "stable" }; }
  if (state.pending && state.pending.version === v && stable(state.pending.schemas) === stable(schemas)) {
    const changes = diffToolSchemas(base, schemas);
    state.baselines[v] = schemas; state.pending = null;
    return { state, changes, status: "confirmed_drift" };
  }
  state.pending = { version: v, schemas };
  return { state, changes: [], status: "pending_confirmation" };
}
