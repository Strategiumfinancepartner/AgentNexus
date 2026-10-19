import { describe, expect, it } from "vitest";
import { buildDiscovery } from "./registry-core";

const entry = (over: Record<string, unknown>) => ({
  slug: "resend-api", name: "Resend", summary: "Email API", description: "", category: "api",
  capabilities: [], tags: [], auth_mode: "api_key", endpoint: "https://api.resend.com",
  checks_total: 10, checks_ok: 10, health_ok: true, verified: true, ...over,
});

describe("follow offer after discovery", () => {
  it("is offered on a strong (capability) match, for the top result", () => {
    const r = buildDiscovery([entry({ capabilities: ["email"] })], { need: "email", tokens: ["email"], limit: 5 });
    expect(r.follow?.slug).toBe("resend-api");
  });
  it("is not offered on a weak (text-only) match", () => {
    const r = buildDiscovery([entry({ summary: "sends email", verified: false, checks_total: 0, checks_ok: 0, health_ok: null })], { need: "email", tokens: ["email"], limit: 5 });
    expect(r.follow).toBeUndefined();
  });
});
