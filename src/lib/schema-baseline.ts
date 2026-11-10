import { diffToolSchemas, type ToolSchema } from "@/lib/capability-probe.server";

// Schema drift is compared per subject (endpoint + negotiated protocol version),
// and a new shape must be seen on 2 consecutive probes before it counts as drift.
// Why: behind a load balancer during a rolling deploy, probes alternate between
// old and new nodes; naive cycle-to-cycle diffs would report phantom drift.

type Schemas = Record<string, ToolSchema>;
export type SchemaState = {
  baselines: Record<string, Schemas>;
  pending?: { version: string; schemas: Schemas } | null;
};

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
): { state: SchemaState; changes: string[]; status: "baseline" | "stable" | "pending_confirmation" | "confirmed_drift" } {
  const v = version ?? "unknown";
  const state: SchemaState = { baselines: { ...(prevState?.baselines ?? {}) }, pending: prevState?.pending ?? null };
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
