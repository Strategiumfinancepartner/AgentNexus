import { z } from "zod";

export const RECEIPT_ISSUER = "https://agentnexus.app";
export const RECEIPT_TTL_S = 120;
export const EVIDENCE_TTL_S = 86_400;
export const receiptRequestSchema = z.object({
  nonce: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

const observation = z.object({ at: z.string().datetime({ offset: true }).nullable(), age_s: z.number().nonnegative().nullable() });
export const receiptClaimsSchema = z.object({
  iss: z.literal(RECEIPT_ISSUER), aud: z.string().min(1), sub: z.string().min(1),
  scope: z.literal("health:read"), endpoint: z.string().url(), slug: z.string(),
  schema_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  protocol_version: z.string().nullable(), tool_list_complete: z.boolean().nullable(),
  nonce: z.string().min(16).max(128), jti: z.string().uuid(),
  iat: z.number().int(), exp: z.number().int(),
  evidence: z.object({ liveness: observation, capability: observation, schema: observation }),
  probe_verdict: z.enum(["up", "down", "degraded", "unknown", "stale"]),
  probe: z.object({ liveness_ok: z.boolean().nullable(), capability_ok: z.boolean().nullable(), schema_ok: z.boolean().nullable() }),
});
export type HealthReceiptClaims = z.infer<typeof receiptClaimsSchema>;

export type ReceiptCard = {
  slug: string; transport: { endpoint: string | null; kind: string };
  last_probe: { at: string | null; ok: boolean | null; capability_checked_at: string | null; capability_ok: boolean | null; tool_list_complete: boolean | null };
  schema: { hash: string; checked_at: string | null; validated: boolean | null; negotiated_protocol_version: string | null };
};

export function buildReceiptClaims(card: ReceiptCard, principal: string, nonce: string, nowMs = Date.now()): HealthReceiptClaims {
  if (!card.transport.endpoint) throw new Error("No invocation endpoint");
  const iat = Math.floor(nowMs / 1000);
  const evidenceAt = (at: string | null) => {
    const time = at ? Date.parse(at) : NaN;
    return Number.isFinite(time) && time <= nowMs ? { at, age_s: Math.ceil((nowMs - time) / 1000) } : { at: null, age_s: null };
  };
  const evidence = {
    liveness: evidenceAt(card.last_probe.at), capability: evidenceAt(card.last_probe.capability_checked_at), schema: evidenceAt(card.schema.checked_at),
  };
  const mcp = card.transport.kind.startsWith("mcp-");
  const required = mcp ? [evidence.liveness, evidence.capability] : [evidence.liveness];
  // Include schema freshness if it was actually validated; no invented schema success.
  if (card.schema.validated !== null) required.push(evidence.schema);
  let verdict: HealthReceiptClaims["probe_verdict"] = "up";
  if (required.some((e) => e.age_s === null)) verdict = "unknown";
  else if (required.some((e) => (e.age_s ?? Infinity) >= EVIDENCE_TTL_S)) verdict = "stale";
  else if (card.last_probe.ok === false) verdict = "down";
  else if (card.last_probe.ok !== true) verdict = "unknown";
  else if (card.last_probe.capability_ok === false || card.schema.validated === false || (mcp && card.last_probe.tool_list_complete !== true)) verdict = "degraded";
  else if (mcp && card.last_probe.capability_ok !== true) verdict = "unknown";
  const deadlines = required.flatMap((e) => e.at ? [Math.floor(Date.parse(e.at) / 1000) + EVIDENCE_TTL_S] : []);
  return receiptClaimsSchema.parse({
    iss: RECEIPT_ISSUER, aud: principal, sub: principal, scope: "health:read", endpoint: card.transport.endpoint,
    slug: card.slug, schema_hash: card.schema.hash, protocol_version: card.schema.negotiated_protocol_version,
    tool_list_complete: card.last_probe.tool_list_complete, nonce, jti: crypto.randomUUID(), iat,
    exp: Math.min(iat + RECEIPT_TTL_S, ...deadlines), evidence, probe_verdict: verdict,
    probe: { liveness_ok: card.last_probe.ok, capability_ok: card.last_probe.capability_ok, schema_ok: card.schema.validated },
  });
}

export type ReceiptExpectation = {
  principal: string; endpoint: string; schemaHash: string; nonce: string;
  scope: string; maxEvidenceAgeS: number; nowMs?: number;
};

/** Caller supplies a pinned/trusted issuer JWKS key, never a URL from the token. */
export async function verifyHealthReceipt(token: string, jwk: Omit<JsonWebKey, "key_ops"> & { kid?: string; key_ops?: readonly string[] }, expected: ReceiptExpectation): Promise<HealthReceiptClaims> {
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 16_384) throw new Error("Invalid receipt");
  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart || !signaturePart) throw new Error("Invalid receipt");
  const decode = (part: string) => Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const header = JSON.parse(new TextDecoder().decode(decode(headerPart)));
  if (header.alg !== "ES256" || header.typ !== "agentnexus-health-receipt+jwt" || !jwk.kid || header.kid !== jwk.kid || header.crit) throw new Error("Untrusted receipt header");
  const key = await crypto.subtle.importKey("jwk", { ...jwk, key_ops: ["verify"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, decode(signaturePart), new TextEncoder().encode(`${headerPart}.${payloadPart}`))) throw new Error("Invalid signature");
  const claims = receiptClaimsSchema.parse(JSON.parse(new TextDecoder().decode(decode(payloadPart))));
  const now = Math.floor((expected.nowMs ?? Date.now()) / 1000);
  if (claims.aud !== expected.principal || claims.sub !== expected.principal) throw new Error("Wrong caller");
  if (claims.scope !== expected.scope || claims.endpoint !== expected.endpoint || claims.schema_hash !== expected.schemaHash || claims.nonce !== expected.nonce) throw new Error("Wrong invocation context");
  if (claims.iat > now || claims.exp <= now || claims.exp <= claims.iat || claims.exp - claims.iat > RECEIPT_TTL_S) throw new Error("Expired or invalid receipt lifetime");
  if (claims.probe_verdict !== "up" || claims.probe.liveness_ok !== true || claims.tool_list_complete === false || claims.probe.capability_ok === false || claims.probe.schema_ok === false) throw new Error("Unsafe probe verdict");
  if (!Number.isFinite(expected.maxEvidenceAgeS) || expected.maxEvidenceAgeS < 0) throw new Error("Invalid freshness policy");
  const limit = Math.min(EVIDENCE_TTL_S, expected.maxEvidenceAgeS);
  for (const [kind, evidence] of Object.entries(claims.evidence)) {
    const required = kind === "liveness" || (kind === "capability" && claims.protocol_version !== null) || (kind === "schema" && claims.probe.schema_ok !== null);
    if (!evidence.at) { if (required) throw new Error("Missing evidence"); continue; }
    const at = Math.floor(Date.parse(evidence.at) / 1000);
    if (at > claims.iat || now - at >= limit || evidence.age_s === null || Math.abs(evidence.age_s - (claims.iat - at)) > 1) throw new Error("Stale or inconsistent evidence");
  }
  return claims;
}