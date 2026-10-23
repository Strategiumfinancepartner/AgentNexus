import { afterEach, expect, it, vi } from "vitest";

vi.mock("./watch.server", () => ({ notifyWatchers: vi.fn() }));
import { probeNovaData } from "./data-quality.server";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("Nova retries a cold-start 503 after 10 seconds before accepting unavailable observations", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T04:00:00Z"));
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response("warming", { status: 503 }))
    .mockResolvedValueOnce(new Response("warming", { status: 503 }))
    .mockResolvedValueOnce(Response.json({ generated_at: Date.now() / 1000 }))
    .mockResolvedValueOnce(Response.json({ count_live: 100000 }));
  vi.stubGlobal("fetch", fetchMock);
  const pending = probeNovaData();
  await vi.advanceTimersByTimeAsync(9999);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(await pending).toMatchObject({ fresh: true, volume: true });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("Nova retains unknown observations after both attempts fail rather than claiming an outage", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValue(new Response("warming", { status: 503 }));
  vi.stubGlobal("fetch", fetchMock);
  const pending = probeNovaData();
  await vi.advanceTimersByTimeAsync(10000);
  expect(await pending).toMatchObject({ fresh: null, volume: null });
  expect(fetchMock).toHaveBeenCalledTimes(4);
});