/**
 * Freemium quotas for the public agent API.
 *
 * Anonymous callers get a small daily allowance per IP so any agent can try the
 * registry without signing up. A registered key raises it; an active
 * subscription raises it a lot. Counting happens in the database through a
 * SECURITY DEFINER function so no client can forge or read the counters.
 *
 * The gate fails OPEN: if the quota backend is unavailable the request is
 * served. Discovery staying up matters more than perfect accounting.
 */

import { createHash } from "crypto";

export type QuotaTier = "anon" | "free" | "pro";

export const QUOTA_LIMITS: Record<QuotaTier, number> = {
  anon: 100,
  free: 1_000,
  pro: 50_000,
};

export type QuotaDecision = {
  allowed: boolean;
  tier: QuotaTier;
  used: number;
  limit: number;
  headers: Record<string, string>;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function extractKey(request: Request, url: URL): string | null {
  const header = request.headers.get("x-api-key")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (/^bearer\s+nx_/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  const param = url.searchParams.get("key")?.trim();
  return param || null;
}

function callerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

type AdminClient = {
  from: (table: string) => any;
  rpc: (fn: string, args: unknown) => any;
};

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AdminClient;
}

async function resolveTier(
  client: AdminClient,
  rawKey: string,
): Promise<{ tier: QuotaTier; actor: string } | null> {
  const { data } = await client
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", sha256(rawKey))
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  void client
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(
      () => undefined,
      () => undefined,
    );

  let tier: QuotaTier = "free";
  for (const env of ["live", "sandbox"] as const) {
    const { data: active } = await client.rpc("has_active_subscription", {
      user_uuid: data.user_id,
      check_env: env,
    });
    if (active === true) {
      tier = "pro";
      break;
    }
  }

  return { tier, actor: `key:${data.id}` };
}

/** Counts one API call and reports whether the caller is still within quota. */
export async function enforceQuota(request: Request): Promise<QuotaDecision> {
  const url = new URL(request.url);
  const rawKey = extractKey(request, url);

  let tier: QuotaTier = "anon";
  let actor = `ip:${sha256(callerIp(request)).slice(0, 32)}`;

  try {
    const client = await admin();

    if (rawKey) {
      const resolved = await resolveTier(client, rawKey);
      if (resolved) {
        tier = resolved.tier;
        actor = resolved.actor;
      }
    }

    const limit = QUOTA_LIMITS[tier];
    const { data, error } = await client.rpc("consume_api_quota", {
      _actor: actor,
      _limit: limit,
    });
    if (error || !data) throw new Error("quota backend unavailable");

    const used = Number(data.used ?? 0);
    const allowed = data.allowed !== false;
    return {
      allowed,
      tier,
      used,
      limit,
      headers: quotaHeaders(tier, used, limit),
    };
  } catch {
    const limit = QUOTA_LIMITS[tier];
    return { allowed: true, tier, used: 0, limit, headers: quotaHeaders(tier, 0, limit) };
  }
}

function quotaHeaders(tier: QuotaTier, used: number, limit: number): Record<string, string> {
  return {
    "X-Nexus-Tier": tier,
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(limit - used, 0)),
  };
}

/** Standard 429 body: tells the agent exactly how to raise its own quota. */
export function quotaExceeded(
  decision: QuotaDecision,
  origin: string,
  cors: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify(
      {
        error: "Daily quota exceeded",
        tier: decision.tier,
        limit: decision.limit,
        used: decision.used,
        resets: "00:00 UTC",
        how_to_raise:
          decision.tier === "anon"
            ? "Create a free API key and send it as the x-api-key header."
            : "Upgrade to Agent Pro for a higher daily quota.",
        keys_url: `${origin}/keys`,
        pricing_url: `${origin}/pricing`,
      },
      null,
      2,
    ),
    { status: 429, headers: { ...cors, ...decision.headers, "Cache-Control": "no-store" } },
  );
}
