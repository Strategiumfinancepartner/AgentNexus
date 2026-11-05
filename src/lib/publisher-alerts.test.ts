import { describe, expect, it, vi } from "vitest";
import { describePublisherChange, publisherState } from "./publisher-alerts";
import { assessNovaData } from "./data-quality";
import { deliver, retryPendingDeliveries, MAX_ATTEMPTS } from "./alert-delivery.server";

const all = { outage: true, schema: true, data: true };
const opts = { minVolume: 100000, staleHours: 24 };

describe("publisher alerts", () => {
  it("12 stale sources produce one alert, and no repeat while the list is unchanged", () => {
    const now = 2_000_000_000;
    const map: Record<string, string> = {};
    for (let i = 0; i < 83; i++) map[`s${String(i).padStart(2, "0")}`] = new Date((now - (i < 12 ? 30 : 1) * 3600) * 1000).toISOString();
    const q = assessNovaData(now - 60, 1_400_000, now, { sourceLastUpdated: map, staleHours: 24 });
    expect(q.staleSources).toHaveLength(12);
    const before = publisherState({ up: true, schema: true, fresh: true, volume: true, stale: [], sourcesTotal: 83 }, all);
    const after = publisherState({ up: true, schema: true, fresh: true, volume: true, stale: q.staleSources, sourcesTotal: 83 }, all);
    const changes = describePublisherChange(before, after, opts);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toContain("12 of 83 sources not updated for 24h+");
    expect(describePublisherChange(after, after, opts)).toEqual([]);
  });

  it("outage alert only once confirmed, then recovery", () => {
    const up = publisherState({ up: true, schema: true }, { ...all, data: false });
    const down = publisherState({ up: false, schema: true }, { ...all, data: false });
    expect(describePublisherChange(up, down, opts)[0]).toContain("OUTAGE");
    expect(describePublisherChange(down, up, opts)[0]).toContain("RECOVERED");
  });

  it("structure change is reported separately from data quality", () => {
    const a = publisherState({ up: true, schema: true, fresh: true, volume: true, stale: [], sourcesTotal: 83 }, all);
    const b = publisherState({ up: true, schema: false, fresh: true, volume: true, stale: [], sourcesTotal: 83 }, all);
    expect(describePublisherChange(a, b, opts)).toEqual(["SCHEMA CHANGE: response no longer matches its documented structure"]);
  });
});

describe("delivery retries", () => {
  function fakeAdmin(rows: any[] = []) {
    const inserted: any[] = [], updated: any[] = [];
    const chain: any = { select: () => chain, eq: () => chain, lte: () => chain, limit: async () => ({ data: rows }), insert: async (r: any) => { inserted.push(r); return {}; }, update: (u: any) => { updated.push(u); return { eq: async () => ({}) }; } };
    return { admin: { from: () => chain }, inserted, updated };
  }

  it("a failed webhook stays pending instead of being dropped", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no", { status: 500 }));
    try {
      const { admin, inserted } = fakeAdmin();
      const ok = await deliver(admin, { entryId: "e", audience: "publisher", channel: "webhook", target: "https://x.test/h", secret: "s", payload: { a: 1 } });
      expect(ok).toBe(false);
      expect(inserted[0].status).toBe("pending");
      const headers = (f.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
      expect(headers["x-agentnexus-signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    } finally { f.mockRestore(); }
  });

  it("gives up after 5 attempts", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no", { status: 500 }));
    try {
      const { admin, updated } = fakeAdmin([{ id: "d", channel: "webhook", target: "https://x.test/h", secret: null, payload: {}, attempts: MAX_ATTEMPTS - 1 }]);
      const r = await retryPendingDeliveries(admin);
      expect(MAX_ATTEMPTS).toBe(5);
      expect(r.failed).toBe(1);
      expect(updated[0].status).toBe("failed");
    } finally { f.mockRestore(); }
  });
});
