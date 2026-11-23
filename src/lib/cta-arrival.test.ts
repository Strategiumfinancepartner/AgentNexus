import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackCtaArrival, CTA_ARRIVAL_EVENT } from "./cta-arrival";

describe("CTA arrival event", () => {
  let track: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    const store = new Map<string, string>();
    track = vi.fn();
    (globalThis as any).window = {
      location: { pathname: "/connect" },
      sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
      __lovableEvents: { track },
    };
  });
  it("sends cta, source slug and landing page", () => {
    trackCtaArrival("entry_cta_mcp", "firecrawl-mcp");
    expect(track).toHaveBeenCalledWith(CTA_ARRIVAL_EVENT, expect.objectContaining({ cta: "entry_cta_mcp", from_slug: "firecrawl-mcp", landing_path: "/connect" }));
  });
  it("is sent once per tab on refresh", () => {
    trackCtaArrival("entry_cta_mcp", "firecrawl-mcp");
    trackCtaArrival("entry_cta_mcp", "firecrawl-mcp");
    expect(track).toHaveBeenCalledTimes(1);
  });
  it("ignores unknown refs", () => {
    expect(trackCtaArrival("newsletter", "x")).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
});
