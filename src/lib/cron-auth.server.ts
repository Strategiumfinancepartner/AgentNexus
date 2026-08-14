/** Shared bearer authentication for scheduled/ops endpoints. */

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/**
 * Accepts either the operator secret (`CRON_SECRET`) or the internal token the
 * database scheduler uses (`ops_config.cron_token`), so pg_cron can call the
 * endpoint without any secret ever leaving the backend.
 */
export async function authorizeOpsRequest(request: Request): Promise<boolean> {
  const provided = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!provided) return false;

  const secret = process.env["CRON_SECRET"];
  if (secret && timingSafeEqual(provided, secret)) return true;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as unknown as { from: (t: string) => any })
      .from("ops_config")
      .select("value")
      .eq("key", "cron_token")
      .maybeSingle();
    const token = (data as { value?: string } | null)?.value;
    return Boolean(token && timingSafeEqual(provided, token));
  } catch {
    return false;
  }
}

export const jsonHeaders = { "Content-Type": "application/json" };
