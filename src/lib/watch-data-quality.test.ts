import { expect, it, vi } from "vitest";
import { notifyWatchers, watchState } from "./watch.server";

it("confirmed watches receive concrete stale-data and low-volume changes", async () => {
  const snapshot = { up: true, schema_ok: true, tools: [], fresh: true, volume: true };
  const before = await watchState(snapshot);
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), not: vi.fn().mockResolvedValue({ data: [{ id: "watch", webhook_url: "https://example.test/hook", last_state: before }] }), update: vi.fn().mockReturnThis() };
  const send = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
  try {
    await notifyWatchers({ from: () => chain }, { id: "entry", slug: "remote-jobs-api-api-nfpe", name: "Remote Jobs" }, { ...snapshot, schema_ok: false, fresh: false, volume: false });
    expect(chain.not).toHaveBeenCalledWith("confirmed_at", "is", null);
    const body = JSON.parse(String(send.mock.calls[0]?.[1]?.body));
    expect(body.changes).toContain("data is older than 6 hours");
    expect(body.changes).toContain("live offers fell below 100,000");
  } finally { send.mockRestore(); }
});