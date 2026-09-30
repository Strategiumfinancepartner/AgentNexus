/**
 * A2A agent-card signing (JWS, ES256, detached payload).
 *
 * A2A §5.5.5: an agent card MAY carry `signatures: [{ protected, signature }]`.
 * Verifiers rebuild the signing input from the card with the `signatures` field
 * removed, so the payload MUST be serialized exactly the way we serve it.
 * The public half is published at /.well-known/jwks.json and referenced by the
 * `jku` header, so any directory can verify without pre-shared material.
 */

export const SIGNING_KID = "agentnexus-2026-09";

/** Public half of the signing key — safe to ship in code and serve as JWKS. */
export const PUBLIC_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "fw_zg0Wx0jwVnRbmSyHVgVhAfTa6HMhxkO_qEIxho7Q",
  y: "8p_G1h7mggFtgknJE3cSqyk9H5RFo6LkCAiG7VNvw1A",
  kid: SIGNING_KID,
  alg: "ES256",
  use: "sig",
  key_ops: ["verify"],
} as const;

function b64url(bytes: Uint8Array | ArrayBuffer) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlText(text: string) {
  return b64url(new TextEncoder().encode(text));
}

let cachedKey: CryptoKey | null = null;

async function signingKey(): Promise<CryptoKey | null> {
  if (cachedKey) return cachedKey;
  const raw = process.env["AGENT_CARD_SIGNING_JWK"];
  if (!raw) return null;
  try {
    const jwk = JSON.parse(raw);
    cachedKey = await crypto.subtle.importKey(
      "jwk",
      { ...jwk, key_ops: ["sign"], ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
    return cachedKey;
  } catch (err) {
    console.error("agent-card signing key unusable", err);
    return null;
  }
}

/** RFC 8785 JSON Canonicalization Scheme — what A2A verifiers rebuild. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

type AdminLike = { from: (t: string) => any };

/**
 * ECDSA signatures are randomized, so re-signing on every fetch made the card
 * "drift" for every directory. The signature is stored per payload hash and
 * reused until the card content actually changes.
 */
async function storedSignature(hash: string): Promise<{ admin: AdminLike | null; sig: any | null }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminLike;
    const { data } = await admin.from("ops_config").select("value").eq("key", `agent_card_sig:${hash}`).maybeSingle();
    return { admin, sig: data?.value ? JSON.parse(data.value) : null };
  } catch {
    return { admin: null, sig: null };
  }
}

/**
 * Returns the card with a detached-payload JWS appended, or the card untouched
 * when no key is configured — an unsigned card is valid, a bogus one is not.
 */
export async function signAgentCard<T extends Record<string, unknown>>(
  card: T,
  origin: string,
): Promise<T> {
  const { signatures: _drop, ...unsigned } = card as Record<string, unknown>;
  const payload = canonicalJson(unsigned);
  const hash = (await sha256Hex(`${origin}\n${payload}`)).slice(0, 32);

  const { admin, sig } = await storedSignature(hash);
  if (sig?.protected && sig?.signature) return { ...card, signatures: [sig] };

  const key = await signingKey();
  if (!key) return card;

  const protectedHeader = {
    alg: "ES256",
    kid: SIGNING_KID,
    jku: `${origin}/.well-known/jwks.json`,
    typ: "JOSE",
  };
  const encodedProtected = b64urlText(JSON.stringify(protectedHeader));
  const signingInput = `${encodedProtected}.${b64urlText(payload)}`;

  try {
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput),
    );
    const entry = { protected: encodedProtected, signature: b64url(signature) };
    if (admin) {
      try {
        await admin
          .from("ops_config")
          .upsert({ key: `agent_card_sig:${hash}`, value: JSON.stringify(entry) }, { onConflict: "key", ignoreDuplicates: true });
      } catch {
        // cache is best-effort
      }
    }
    return { ...card, signatures: [entry] };
  } catch (err) {
    console.error("agent-card signing failed", err);
    return card;
  }
}
