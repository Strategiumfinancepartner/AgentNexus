/**
 * Listing-page calls to action and their attribution. Pure and browser-safe.
 * Attribution rides in the existing `purpose` text of POST /api/public/keys,
 * so the key API, its schema and the `agent` field stay unchanged.
 */
export const CTA_REFS = ["entry_cta_alt", "entry_cta_mcp", "entry_cta_key"] as const;
export type CtaRef = (typeof CTA_REFS)[number];

export function isCtaRef(v: unknown): v is CtaRef {
  return typeof v === "string" && (CTA_REFS as readonly string[]).includes(v);
}

/** Unambiguous marker stored in api_keys.agent_label for keys minted from a listing CTA. */
export const KEY_REF_MARKER = "[ref:entry_cta_key]";

export function keyPurpose(ref: string | undefined): string {
  const base = "evaluating the registry";
  return ref === "entry_cta_key" ? `${base} ${KEY_REF_MARKER}` : base;
}

export function isCtaKey(label: string | null | undefined): boolean {
  return (label ?? "").includes(KEY_REF_MARKER);
}

const GENERIC = new Set(["mcp", "api", "cli", "remote", "server", "official", "http", "rest", "tool", "tools"]);

/** Most specific shared term from the listing: first non-generic tag, else first capability. */
export function alternativeTerm(entry: { tags?: string[]; capabilities?: string[] }): string {
  const tag = (entry.tags ?? []).find((t) => t && !GENERIC.has(t.toLowerCase()));
  return (tag ?? entry.capabilities?.[0] ?? "").trim().toLowerCase();
}

/** Conversion stages for CTA-minted keys. A key creation is never counted as adoption. */
export function ctaKeyFunnel(keys: { label: string; calls: number; activeDays: number }[]) {
  const cta = keys.filter((k) => isCtaKey(k.label));
  return {
    keysCreated: cta.length,
    firstAuthenticatedCall: cta.filter((k) => k.calls > 0).length,
    recurring: cta.filter((k) => k.activeDays >= 2).length,
  };
}
