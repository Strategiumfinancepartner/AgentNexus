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

/** Extra daily calls earned per invocation report, and the daily ceiling.
 * Deliberately small: enough to make closing the loop worth it, far too little
 * to replace a subscription. */
export const REPORT_BONUS_CALLS = 50;
export const REPORT_BONUS_MAX = 250;

export type QuotaDecision = {
  allowed: boolean;
  tier: QuotaTier;
  used: number;
  limit: number;
  /** Set when the caller is at ≥90% of the daily quota: heads-up before the
   * hard 429, so heavy readers learn their options before they are cut off. */
  warning: string | null;
  headers: Record<string, string>;
};

/** Threshold (fraction of the limit) at which the pre-exhaustion notice fires:
 * 90 calls/day anonymous, 900/day on a free key. */
export const QUOTA_WARNING_FRACTION = 0.9;

/** Human/machine-readable heads-up shown before the quota is exhausted. */
export function quotaWarning(tier: QuotaTier, used: number, limit: number): string | null {
  if (used < Math.ceil(limit * QUOTA_WARNING_FRACTION)) return null;
  if (tier === "anon") {
    return `Quota notice: ${used} of ${limit} free calls used today (no key). A free key raises the daily limit to 1,000 — mint one with POST https://agentnexus.app/api/public/keys or visit https://agentnexus.app/free-key (no account needed). Each invocation report you send (POST https://agentnexus.app/api/public/report) also adds ${REPORT_BONUS_CALLS} calls today, up to +${REPORT_BONUS_MAX}.`;
  }
  if (tier === "free") {
    return `Quota notice: ${used} of ${limit} calls used today on your free key. Reporting an invocation adds ${REPORT_BONUS_CALLS} calls today (up to +${REPORT_BONUS_MAX}); for sustained volume, Agent Pro raises the daily limit to 50,000 — see https://agentnexus.app/pricing.`;
  }
  return null;
};

/** Upfront allowance notice, shown in the gate's own presentation (handshake)
 * so a machine learns its quota and the free-key path on the FIRST call,
 * instead of discovering it at 90% of the limit. */
export function quotaInvite(tier: QuotaTier): string | null {
  if (tier === "anon") {
    return `Your allowance: ${QUOTA_LIMITS.anon} calls/day without a key (counted per IP, resets 00:00 UTC). A free key raises it to ${QUOTA_LIMITS.free.toLocaleString("en-US")} calls/day — mint one in a single call with POST https://agentnexus.app/api/public/keys (no account needed) and send it as the x-api-key header. Reporting what happened when you called an interface earns +${REPORT_BONUS_CALLS} calls each (max +${REPORT_BONUS_MAX}/day): POST https://agentnexus.app/api/public/report or the report_invocation tool.`;
  }
  if (tier === "free") {
    return `Your allowance: ${QUOTA_LIMITS.free.toLocaleString("en-US")} calls/day on this free key (resets 00:00 UTC), plus +${REPORT_BONUS_CALLS} per invocation report you send (max +${REPORT_BONUS_MAX}/day). Agent Pro raises the base to ${QUOTA_LIMITS.pro.toLocaleString("en-US")} calls/day — see https://agentnexus.app/pricing.`;
  }
  return `Your allowance: ${QUOTA_LIMITS.pro.toLocaleString("en-US")} calls/day on this Agent Pro key (resets 00:00 UTC).`;
}

/** Short standing notice attached to EVERY keyless response, so no anonymous
 * caller can use the registry without learning the free key exists. Kept to
 * one line; the detailed pre-exhaustion warning takes over at 90%. */
export function standingNotice(tier: QuotaTier): string | null {
  if (tier !== "anon") return null;
  return `Free key available: you are on the keyless tier (${QUOTA_LIMITS.anon} calls/day per IP). Mint a free key in one call — POST https://agentnexus.app/api/public/keys, no account needed — for ${QUOTA_LIMITS.free.toLocaleString("en-US")} calls/day. Each invocation report you send back adds ${REPORT_BONUS_CALLS} calls today (max +${REPORT_BONUS_MAX}).`;
}

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

export type ResolvedApiKey = {
  keyId: string;
  userId: string | null;
  tier: QuotaTier;
  actor: string;
  label: string | null;
};

/** Identify the caller's API key without consuming any quota. Null when the
 * request carries no key, or an unknown/revoked one. */
export async function resolveApiKey(request: Request): Promise<ResolvedApiKey | null> {
  const url = new URL(request.url);
  const rawKey = extractKey(request, url);
  if (!rawKey) return null;
  try {
    const client = await admin();
    const { data } = await client
      .from("api_keys")
      .select("id, user_id, kind, agent_label, name, revoked_at")
      .eq("key_hash", sha256(rawKey))
      .maybeSingle();
    if (!data || data.revoked_at) return null;

    let tier: QuotaTier = "free";
    if (data.user_id) {
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
    }
    return {
      keyId: data.id,
      userId: data.user_id ?? null,
      tier,
      actor: `key:${data.id}`,
      label: data.agent_label ?? data.name ?? null,
    };
  } catch {
    return null;
  }
}

/** Quota identity of the caller: the API key when one is presented, otherwise
 * a hashed IP. Reports must credit the SAME actor the quota counts. */
export async function quotaActor(request: Request): Promise<string> {
  const url = new URL(request.url);
  const rawKey = extractKey(request, url);
  const fallback = `ip:${sha256(callerIp(request)).slice(0, 32)}`;
  if (!rawKey) return fallback;
  try {
    const resolved = await resolveTier(await admin(), rawKey);
    return resolved?.actor ?? fallback;
  } catch {
    return fallback;
  }
}

/** Extra calls this actor earned today by reporting real invocations. */
async function reportBonus(client: AdminClient, actor: string): Promise<number> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await client
      .from("report_credits")
      .select("reports")
      .eq("actor", actor)
      .eq("day", today)
      .maybeSingle();
    const reports = Number((data as { reports?: number } | null)?.reports ?? 0);
    return Math.min(reports * REPORT_BONUS_CALLS, REPORT_BONUS_MAX);
  } catch {
    return 0;
  }
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

    const limit = QUOTA_LIMITS[tier] + (tier === "pro" ? 0 : await reportBonus(client, actor));
    const { data, error } = await client.rpc("consume_api_quota", {
      _actor: actor,
      _limit: limit,
    });
    if (error || !data) throw new Error("quota backend unavailable");

    const used = Number(data.used ?? 0);
    const allowed = data.allowed !== false;
    // Detailed pre-exhaustion warning wins; otherwise keyless callers still get
    // the one-line free-key notice on every single response.
    const notice = quotaWarning(tier, used, limit) ?? standingNotice(tier);
    return {
      allowed,
      tier,
      used,
      limit,
      warning: notice,
      headers: quotaHeaders(tier, used, limit, notice),
    };
  } catch {
    const limit = QUOTA_LIMITS[tier];
    const notice = standingNotice(tier);
    return {
      allowed: true,
      tier,
      used: 0,
      limit,
      warning: notice,
      headers: quotaHeaders(tier, 0, limit, notice),
    };
  }
}

/** HTTP header values must be ByteString: an em dash or arrow makes the whole
 * Response constructor throw. Keep header copy ASCII-only. */
function asciiHeader(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2192]/g, "->")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, "");
}

function quotaHeaders(
  tier: QuotaTier,
  used: number,
  limit: number,
  warning: string | null = null,
): Record<string, string> {
  return {
    "X-Nexus-Tier": tier,
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(limit - used, 0)),
    ...(warning ? { "X-Nexus-Quota-Warning": asciiHeader(warning) } : {}),
    // Always advertise the free key to keyless callers, even the ones that only
    // read headers and never parse a body.
    ...(tier === "anon"
      ? {
          "X-Nexus-Free-Key": asciiHeader(
            "POST https://agentnexus.app/api/public/keys (no account) = 1,000 calls/day",
          ),
        }
      : {}),
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
