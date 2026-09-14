import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type QuotaSummary = {
  tier: "free" | "pro";
  limit: number;
  usedToday: number;
};

export const listMyKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ keys: ApiKeyRow[]; quota: QuotaSummary }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (t: string) => any;
      rpc: (f: string, a: unknown) => any;
    };

    const { data: keys } = await client
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const { QUOTA_LIMITS } = await import("@/lib/quota.server");

    let tier: "free" | "pro" = "free";
    for (const env of ["live", "sandbox"] as const) {
      const { data: active } = await client.rpc("has_active_subscription", {
        user_uuid: context.userId,
        check_env: env,
      });
      if (active === true) {
        tier = "pro";
        break;
      }
    }

    const ids = (keys ?? []).map((k: ApiKeyRow) => `key:${k.id}`);
    let usedToday = 0;
    if (ids.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await client
        .from("api_usage")
        .select("calls")
        .in("actor", ids)
        .eq("day", today);
      usedToday = (usage ?? []).reduce(
        (sum: number, row: { calls: number }) => sum + Number(row.calls ?? 0),
        0,
      );
    }

    return {
      keys: (keys ?? []) as ApiKeyRow[],
      quota: { tier, limit: QUOTA_LIMITS[tier], usedToday },
    };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ name: z.string().trim().min(1).max(60).default("default") }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ key: string; prefix: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createHash, randomBytes } = await import("crypto");
    const client = supabaseAdmin as unknown as { from: (t: string) => any };

    const { count } = await client
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("revoked_at", null);
    if ((count ?? 0) >= 5) throw new Error("You already have 5 active keys. Revoke one first.");

    const secret = randomBytes(24).toString("hex");
    const key = `nx_${secret}`;
    const prefix = key.slice(0, 11);

    const { error } = await client.from("api_keys").insert({
      user_id: context.userId,
      name: data.name,
      key_prefix: prefix,
      key_hash: createHash("sha256").update(key).digest("hex"),
    });
    if (error) throw new Error("Could not create the key. Try again.");

    return { key, prefix };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as { from: (t: string) => any };
    await client
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
