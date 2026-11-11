import { buildReceiptClaims, receiptRequestSchema, RECEIPT_ISSUER, type ReceiptCard } from "./health-receipt";
import { signHealthReceipt } from "./agent-card-signature.server";
import { resolveApiKey, enforceQuota } from "./quota.server";

export const receiptHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
};

export async function serveHealthReceipt(request: Request, getCard: () => Promise<Response>): Promise<Response> {
  const json = (body: unknown, status = 200, extra = {}) => Response.json(body, { status, headers: { ...receiptHeaders, ...extra } });
  // Credentials belong in headers, never in a URL or a caller-controlled body identity.
  const credential = request.headers.get("x-api-key")?.trim() || request.headers.get("authorization")?.match(/^Bearer\s+(nx_\S+)$/i)?.[1];
  if (!credential || credential.length > 512) return json({ error: "A valid Agent Nexus API key in x-api-key or Authorization is required" }, 401);
  const authRequest = new Request(`${RECEIPT_ISSUER}/`, { headers: { "x-api-key": credential } });
  const caller = await resolveApiKey(authRequest);
  if (!caller) return json({ error: "Unknown, revoked or unverifiable API key" }, 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "Use application/json" }, 415);
  const text = await request.text();
  if (text.length > 1024) return json({ error: "Receipt request too large" }, 413);
  let nonce: string;
  try { nonce = receiptRequestSchema.parse(JSON.parse(text)).nonce; }
  catch { return json({ error: "Provide only a nonce: 16-128 URL-safe characters" }, 400); }
  const quota = await enforceQuota(authRequest);
  if (!quota.allowed) return json({ error: "Daily quota exceeded" }, 429, quota.headers);
  const response = await getCard();
  if (!response.ok) return json(await response.json(), response.status);
  const card = await response.json() as ReceiptCard;
  if (!card.transport.endpoint?.startsWith("https://")) return json({ error: "Receipts require an HTTPS invocation endpoint" }, 422);
  try {
    const claims = buildReceiptClaims(card, caller.actor, nonce);
    const receipt = await signHealthReceipt(claims);
    return json({ receipt, format: "compact-jws", principal: caller.actor, jwks_url: `${RECEIPT_ISSUER}/.well-known/jwks.json`,
      verification: "Verify ES256 with trusted Agent Nexus JWKS; match caller, endpoint, schema hash, scope and your nonce; check expiry, evidence age and verdict. This is evidence, not provider authorization or an execution guarantee." }, 200, quota.headers);
  } catch {
    return json({ error: "Signed receipt unavailable; do not invoke on an unsigned fallback" }, 503);
  }
}