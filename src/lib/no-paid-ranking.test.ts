import { describe, expect, it } from "vitest";
import { buildDiscovery, needTokens } from "./registry-core";

const entry = (slug: string, featured: boolean) => ({
  slug, name: slug, category: "api", capabilities: ["send email"], summary: "", description: "", tags: [],
  checks_total: 10, checks_ok: 10, health_ok: true, verified: false, featured,
});
const discover = (rows: unknown[]) => buildDiscovery(rows, { need: "send email", tokens: needTokens("send email") });

describe("no paid ranking", () => {
  it("a featured (Publisher) entry gets the same score as an identical non-featured one", () => {
    const r = discover([entry("a-api", false), entry("b-api", true)]);
    const [x, y] = r.matches as Array<{ match_score: number }>;
    expect(x.match_score).toBe(y.match_score);
  });
});
