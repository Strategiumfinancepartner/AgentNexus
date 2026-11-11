import { describe, expect, it, vi } from "vitest";
import { buildReceiptClaims, verifyHealthReceipt, receiptRequestSchema, type ReceiptCard, type ReceiptExpectation } from "./health-receipt";
import { signHealthReceipt, PUBLIC_JWK } from "./agent-card-signature.server";
import { serveHealthReceipt } from "./health-receipt.server";

vi.mock("./quota.server", () => ({ resolveApiKey: vi.fn(), enforceQuota: vi.fn() }));
import { resolveApiKey, enforceQuota } from "./quota.server";

const nowMs = Date.parse("2026-11-11T04:43:00Z");
const at = new Date(nowMs - 60_000).toISOString();
const card: ReceiptCard = {
  slug: "example-mcp", transport: { kind: "mcp-streamable-http", endpoint: "https://example.com/mcp" },
  last_probe: { at, ok: true, capability_checked_at: at, capability_ok: true, tool_list_complete: true },
  schema: { hash: `sha256:${"a".repeat(64)}`, checked_at: at, validated: true, negotiated_protocol_version: "2025-06-18" },
};
const expected: ReceiptExpectation = { principal: "key:caller-a", endpoint: "https://example.com/mcp", schemaHash: card.schema.hash, nonce: "0123456789abcdef", scope: "health:read", maxEvidenceAgeS: 300, nowMs };
const encode = (v: unknown) => btoa(JSON.stringify(v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function fixture() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwk = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "test-key" };
  const claims = buildReceiptClaims(card, expected.principal, expected.nonce, nowMs);
  const input = `${encode({ alg: "ES256", kid: "test-key", typ: "agentnexus-health-receipt+jwt" })}.${encode(claims)}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(input)));
  const signature = btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { token: `${input}.${signature}`, jwk, claims };
}

describe("caller-bound health receipts", () => {
  it("accepts the signed receipt for the matching caller and invocation", async () => {
    const { token, jwk } = await fixture();
    expect((await verifyHealthReceipt(token, jwk, expected)).sub).toBe("key:caller-a");
  });
  it("rejects reuse by a different caller", async () => {
    const { token, jwk } = await fixture();
    await expect(verifyHealthReceipt(token, jwk, { ...expected, principal: "key:caller-b" })).rejects.toThrow("Wrong caller");
  });
  for (const [field, value] of [["endpoint", "https://other.com/mcp"], ["schemaHash", `sha256:${"b".repeat(64)}`], ["scope", "tools:execute"], ["nonce", "different-request-nonce"]] as const) {
    it(`rejects a different ${field}`, async () => {
      const { token, jwk } = await fixture();
      await expect(verifyHealthReceipt(token, jwk, { ...expected, [field]: value })).rejects.toThrow("Wrong invocation context");
    });
  }
  it("expires after 120 seconds", async () => {
    const { token, jwk, claims } = await fixture();
    expect(claims.exp - claims.iat).toBe(120);
    await expect(verifyHealthReceipt(token, jwk, { ...expected, nowMs: nowMs + 120_000 })).rejects.toThrow("lifetime");
  });
  it("rejects an altered payload", async () => {
    const { token, jwk, claims } = await fixture();
    const parts = token.split(".");
    await expect(verifyHealthReceipt(`${parts[0]}.${encode({ ...claims, endpoint: "https://evil.com" })}.${parts[2]}`, jwk, expected)).rejects.toThrow("signature");
  });
  it("enforces caller freshness stricter than issuer freshness", async () => {
    const { token, jwk } = await fixture();
    await expect(verifyHealthReceipt(token, jwk, { ...expected, maxEvidenceAgeS: 30 })).rejects.toThrow("evidence");
  });
  it("does not refresh old evidence by issuing a new receipt", () => {
    const old = new Date(nowMs - 86_400_000).toISOString();
    const claims = buildReceiptClaims({ ...card, last_probe: { ...card.last_probe, at: old } }, expected.principal, expected.nonce, nowMs);
    expect(claims.probe_verdict).toBe("stale");
    expect(claims.exp).toBe(claims.iat);
  });
  it("partial pagination is degraded, not healthy", () => {
    expect(buildReceiptClaims({ ...card, last_probe: { ...card.last_probe, tool_list_complete: false } }, expected.principal, expected.nonce, nowMs).probe_verdict).toBe("degraded");
  });
  it("missing evidence cannot produce an up verdict", () => {
    expect(buildReceiptClaims({ ...card, last_probe: { ...card.last_probe, at: null } }, expected.principal, expected.nonce, nowMs).probe_verdict).toBe("unknown");
  });
  it("accepts persisted probe timestamps with UTC offsets", () => {
    const persistedAt = "2026-11-11T04:42:00.000+00:00";
    const claims = buildReceiptClaims({ ...card, last_probe: { ...card.last_probe, at: persistedAt } }, expected.principal, expected.nonce, nowMs);
    expect(claims.evidence.liveness.age_s).toBe(60);
    expect(claims.probe_verdict).toBe("up");
  });
  it("a failed probe yields down", () => {
    expect(buildReceiptClaims({ ...card, last_probe: { ...card.last_probe, ok: false } }, expected.principal, expected.nonce, nowMs).probe_verdict).toBe("down");
  });
  it("rejects caller identity and arbitrary scope in request bodies", () => {
    expect(receiptRequestSchema.safeParse({ nonce: expected.nonce, caller: "someone-else" }).success).toBe(false);
    expect(receiptRequestSchema.safeParse({ nonce: expected.nonce, scope: "tools:execute" }).success).toBe(false);
  });
  it("refuses anonymous and query-string credentials before reading the card", async () => {
    const getCard = vi.fn();
    const response = await serveHealthReceipt(new Request("https://agentnexus.app/?key=nx_fake", { method: "POST" }), getCard);
    expect(response.status).toBe(401);
    expect(getCard).not.toHaveBeenCalled();
  });
  it("refuses unknown or revoked keys without an anonymous fallback", async () => {
    vi.mocked(resolveApiKey).mockResolvedValueOnce(null);
    const response = await serveHealthReceipt(new Request("https://agentnexus.app/", { method: "POST", headers: { "x-api-key": "nx_invalid" } }), vi.fn());
    expect(response.status).toBe(401);
  });
  it.skipIf(!process.env["AGENT_CARD_SIGNING_JWK"])("returns a private no-store receipt for an authenticated key", async () => {
    vi.mocked(resolveApiKey).mockResolvedValueOnce({ actor: "key:caller-a", keyId: "caller-a", userId: null, tier: "free", label: null, ownerEmail: null });
    vi.mocked(enforceQuota).mockResolvedValueOnce({ allowed: true, tier: "free", used: 1, limit: 1000, warning: null, headers: {} });
    const currentAt = new Date(Date.now() - 60_000).toISOString();
    const currentCard = { ...card, last_probe: { ...card.last_probe, at: currentAt, capability_checked_at: currentAt }, schema: { ...card.schema, checked_at: currentAt } };
    const response = await serveHealthReceipt(new Request("https://agentnexus.app/", { method: "POST", headers: { "x-api-key": "nx_test", "content-type": "application/json" }, body: JSON.stringify({ nonce: expected.nonce }) }), async () => Response.json(currentCard));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const result = await response.json();
    expect(result.principal).toBe("key:caller-a");
    expect((await verifyHealthReceipt(result.receipt, PUBLIC_JWK, { ...expected, nowMs: Date.now() })).probe_verdict).toBe("up");
  });
  it.skipIf(!process.env["AGENT_CARD_SIGNING_JWK"])("production signer matches published JWKS", async () => {
    const claims = buildReceiptClaims(card, expected.principal, expected.nonce, nowMs);
    expect((await verifyHealthReceipt(await signHealthReceipt(claims), PUBLIC_JWK, expected)).schema_hash).toBe(card.schema.hash);
  });
});