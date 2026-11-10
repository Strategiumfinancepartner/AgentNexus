import { describe, expect, it } from "vitest";
import { diffToolSchemas, extractToolSchemas, readProtocolVersion } from "./capability-probe.server";

const s = (props: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties: props, required });

describe("declared tool schema diff", () => {
  it("reports a field whose type changed", () => {
    const before = { search: { input: s({ q: { type: "string" } }), output: null } };
    const after = { search: { input: s({ q: { type: "number" } }), output: null } };
    expect(diffToolSchemas(before, after)).toEqual(['search.input.q type "string" -> "number"']);
  });
  it("reports an enum that lost a member", () => {
    const before = { t: { input: null, output: s({ mode: { type: "string", enum: ["a", "b"] } }) } };
    const after = { t: { input: null, output: s({ mode: { type: "string", enum: ["a"] } }) } };
    expect(diffToolSchemas(before, after)).toEqual(['t.output.mode enum lost "b"']);
  });
  it("reports a removed tool and a newly required input", () => {
    const before = { a: { input: s({ x: { type: "string" } }), output: null }, gone: { input: null, output: null } };
    const after = { a: { input: s({ x: { type: "string" } }, ["x"]), output: null } };
    expect(diffToolSchemas(before, after)).toEqual(["a.input.x became required", "gone removed"]);
  });
  it("ignores additive changes and first snapshots", () => {
    const before = { a: { input: s({}), output: null } };
    const after = { a: { input: s({ y: { type: "string" } }), output: null }, b: { input: null, output: null } };
    expect(diffToolSchemas(before, after)).toEqual([]);
    expect(diffToolSchemas(null, after)).toEqual([]);
  });
  it("reads the negotiated protocol version and tool schemas", () => {
    expect(readProtocolVersion({ result: { protocolVersion: "2025-03-26" } })).toBe("2025-03-26");
    expect(readProtocolVersion({ result: {} })).toBeNull();
    expect(Object.keys(extractToolSchemas({ result: { tools: [{ name: "x", inputSchema: {} }] } }))).toEqual(["x"]);
  });
});
