import { describe, expect, it } from "vitest";
import { advanceSchemaBaseline, schemaSubject } from "./schema-baseline";

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
