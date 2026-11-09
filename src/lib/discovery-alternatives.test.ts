import { describe, it, expect } from "vitest";
import { buildDiscovery, currentHealth, pickAlternatives, needTokens } from "./registry-core";

const base = { category: "api", summary: "", description: "", tags: [], auth_params: [], checks_total: 100, checks_ok: 99, reports_count: 0, verified: true, health_checked_at: "2026-11-09T10:00:00Z" };
const e = (slug: string, o: any) => ({ ...base, slug, name: slug, endpoint: `https://${slug}.test`, capabilities: ["send_email"], auth_mode: "api_key", health_ok: true, ...o });

describe("current health", () => {
  it("down when outage confirmed", () => expect(currentHealth(e("a", { down_since: "x" })).status).toBe("down"));
  it("degraded when schema fails while up", () => expect(currentHealth(e("a", { schema_ok: false })).status).toBe("degraded"));
  it("unknown when never probed", () => expect(currentHealth(e("a", { health_ok: null })).status).toBe("unknown"));
});

describe("alternatives", () => {
  const down = e("mailer-down", { health_ok: false });
  const upSame = e("mailer-up", {});
  const upOauth = e("mailer-oauth", { auth_mode: "oauth" });
  const unrelated = e("weather", { capabilities: ["forecast"], summary: "weather" });
  const t = needTokens("send email");

  it("suggests only currently-up services with shared capability, same auth first", () => {
    const alts = pickAlternatives(down, [down, upOauth, upSame, unrelated], t);
    expect(alts.map((a) => a.slug)).toEqual(["mailer-up", "mailer-oauth"]);
    expect(alts[0].disclaimer).toMatch(/Not guaranteed/);
  });
  it("returns none when no compatible service is up", () => {
    expect(pickAlternatives(down, [down, unrelated, e("x", { health_ok: false })], t)).toEqual([]);
  });
  it("attaches alternatives only to down/degraded matches", () => {
    const r = buildDiscovery([down, upSame], { need: "send email", tokens: t });
    const d = r.matches.find((m) => m.slug === "mailer-down")!;
    const u = r.matches.find((m) => m.slug === "mailer-up")!;
    expect(d.alternatives?.[0].slug).toBe("mailer-up");
    expect(u.alternatives).toBeUndefined();
  });
});
