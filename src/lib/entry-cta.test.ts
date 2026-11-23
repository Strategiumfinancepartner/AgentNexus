import { describe, it, expect } from "vitest";
import { alternativeTerm, ctaKeyFunnel, isCtaKey, keyPurpose, KEY_REF_MARKER } from "./entry-cta";
import { KPI_REFERENCES } from "./kpi-references";

describe("entry CTA attribution", () => {
  it("marks only CTA keys, keeps the default purpose otherwise", () => {
    expect(keyPurpose("entry_cta_key")).toBe(`evaluating the registry ${KEY_REF_MARKER}`);
    expect(keyPurpose(undefined)).toBe("evaluating the registry");
    expect(isCtaKey(`web-visitor — ${keyPurpose("entry_cta_key")}`)).toBe(true);
    expect(isCtaKey("web-visitor — evaluating the registry")).toBe(false);
  });
  it("skips generic tags for alternatives", () => {
    expect(alternativeTerm({ tags: ["mcp", "Crawling"], capabilities: ["x"] })).toBe("crawling");
    expect(alternativeTerm({ tags: ["mcp"], capabilities: ["send email"] })).toBe("send email");
  });
  it("never counts a key creation as adoption", () => {
    const f = ctaKeyFunnel([
      { label: KEY_REF_MARKER, calls: 0, activeDays: 0 },
      { label: KEY_REF_MARKER, calls: 3, activeDays: 1 },
      { label: KEY_REF_MARKER, calls: 9, activeDays: 2 },
      { label: "other", calls: 50, activeDays: 5 },
    ]);
    expect(f).toEqual({ keysCreated: 3, firstAuthenticatedCall: 2, recurring: 1 });
  });
});

describe("historical references stay frozen", () => {
  it("keeps A, B and C values", () => {
    expect(KPI_REFERENCES.A.connectToSearchPct).toBe(21.3);
    expect(KPI_REFERENCES.B.cutoff).toBe("2026-11-16T23:59:00Z");
    expect(KPI_REFERENCES.C.callers).toBe(7527);
    expect(Object.isFrozen(KPI_REFERENCES.C)).toBe(true);
  });
});
