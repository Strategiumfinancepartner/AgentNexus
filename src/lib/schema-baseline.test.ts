import { describe, expect, it } from "vitest";
import { advanceSchemaBaseline, schemaSubject, fleetView, comparisonSubjectView, type SchemaState } from "./schema-baseline";

const A = { t: { input: { type: "object", properties: { q: { type: "string" } } } } } as any;
const B = { t: { input: { type: "object", properties: { q: { type: "number" } } } } } as any;

describe("schema baseline per subject", () => {
  it("rolling deploy flip-flop A,B,A reports no drift", () => {
    let r = advanceSchemaBaseline(null, null, "2025-06-18", A);
    r = advanceSchemaBaseline(r.state, null, "2025-06-18", B);
    expect(r.changes).toEqual([]);
    r = advanceSchemaBaseline(r.state, null, "2025-06-18", A);
    expect(r.changes).toEqual([]);
  });
  it("change seen on 2 consecutive probes is reported", () => {
    let r = advanceSchemaBaseline(null, null, "v1", A);
    r = advanceSchemaBaseline(r.state, null, "v1", B);
    r = advanceSchemaBaseline(r.state, null, "v1", B);
    expect(r.status).toBe("confirmed_drift");
    expect(r.changes.length).toBe(1);
  });
  it("different protocol versions keep separate baselines", () => {
    let r = advanceSchemaBaseline(null, null, "v1", A);
    r = advanceSchemaBaseline(r.state, null, "v2", B);
    expect(r.status).toBe("baseline");
    r = advanceSchemaBaseline(r.state, null, "v1", A);
    expect(r.changes).toEqual([]);
  });
  it("subject key changes with version", () => {
    expect(schemaSubject("e", "v1", A).key).not.toBe(schemaSubject("e", "v2", A).key);
  });
});

describe("complete fleet evidence freshness", () => {
  const t0 = Date.parse("2026-11-12T00:00:00Z");
  const state = (): SchemaState => advanceSchemaBaseline(null, null, "v1", A, t0).state;
  const stored = () => JSON.stringify({ ...schemaSubject("https://example.com/mcp", "v1", A), status: "stable", fleet: fleetView(state(), "v1", t0) });

  it("exposes the complete-only count without removing the legacy alias", () => {
    const f = fleetView(state(), "v1", t0);
    expect(f.complete_observations_24h).toBe(1);
    expect(f.observations_24h).toBe(1);
  });
  it("does not refresh the last complete timestamp during twelve hours without complete probes", () => {
    const f = comparisonSubjectView(stored(), state(), t0 + 12 * 3600_000)?.fleet;
    expect(f.last_complete_at).toBe("2026-11-12T00:00:00.000Z");
    expect(f.complete_observations_24h).toBe(1);
  });
  it("ages a stored sample out at read time without a new successful probe", () => {
    const f = comparisonSubjectView(stored(), state(), t0 + 24 * 3600_000 + 1)?.fleet;
    expect(f.complete_observations_24h).toBe(0);
    expect(f.observations_24h).toBe(0);
    expect(f.distinct_shapes_24h).toBe(0);
    expect(f.last_complete_at).toBe("2026-11-12T00:00:00.000Z");
  });
  it("keeps protocol versions separate and finds the latest timestamp independently of order", () => {
    const st: SchemaState = { baselines: {}, seen: [
      { at: "2026-11-12T02:00:00Z", version: "v1", hash: "a" },
      { at: "2026-11-12T03:00:00Z", version: "v2", hash: "b" },
      { at: "2026-11-12T01:00:00Z", version: "v1", hash: "a" },
    ] };
    const f = fleetView(st, "v1", t0 + 4 * 3600_000);
    expect(f.complete_observations_24h).toBe(2);
    expect(f.last_complete_at).toBe("2026-11-12T02:00:00Z");
  });
  it("does not fabricate evidence for an empty or legacy history", () => {
    expect(fleetView({ baselines: {} }, "v1", t0).last_complete_at).toBeNull();
    const subject = comparisonSubjectView(stored(), null, t0);
    expect(subject.fleet.complete_observations_24h).toBeNull();
    expect(subject.fleet.last_complete_at).toBeNull();
    expect(subject.fleet.observations_24h).toBe(1);
    expect(subject.key).toBe(schemaSubject("https://example.com/mcp", "v1", A).key);
    expect(comparisonSubjectView("invalid", state(), t0)).toBeNull();
  });
});

import { fleetView as _fv, advanceSchemaBaseline as _adv } from "./schema-baseline";
describe("split fleet detection", () => {
  const A = { t: { inputSchema: { a: 1 } } } as any;
  const B = { t: { inputSchema: { b: 1 } } } as any;
  const run = (seq: any[], stepMs: number) => {
    let st: any = null; const t0 = Date.parse("2026-11-10T00:00:00Z");
    seq.forEach((s, i) => { st = _adv(st, null, "2025-06-18", s, t0 + i * stepMs).state; });
    return _fv(st, "2025-06-18", t0 + (seq.length - 1) * stepMs);
  };
  it("one shape is single_shape", () => { expect(run([A, A, A], 3600_000).verdict).toBe("single_shape"); });
  it("A then B that settles is converging", () => { const f = run([A, B, B, B], 3600_000); expect(f.distinct_shapes_24h).toBe(2); expect(f.verdict).toBe("converging"); });
  it("A/B alternating for 8h is split_fleet", () => { expect(run([A, B, A, B, A, B, A, B, A], 3600_000).verdict).toBe("split_fleet"); });
  it("short flip-flop under 6h is not split_fleet", () => { expect(run([A, B, A], 3600_000).verdict).toBe("converging"); });
});
