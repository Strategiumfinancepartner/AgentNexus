import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ENTRY_COLUMNS,
  assertAdmin,
  listInput,
  slugify,
  submitInput,
  type Entry,
} from "@/lib/registry-core";

export { CATEGORIES } from "@/lib/registry-core";
export type { Category, Entry } from "@/lib/registry-core";

/** Approved entries, readable by any signed-in user (enforced by RLS). */
export const listEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("entries")
      .select(ENTRY_COLUMNS)
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(200);

    if (data.category !== "all") query = query.eq("category", data.category);
    if (data.search) {
      // escape PostgREST reserved characters in the pattern
      const term = data.search.replace(/[%,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `name.ilike.%${term}%,summary.ilike.%${term}%,endpoint.ilike.%${term}%,slug.ilike.%${term}%`,
        );
      }
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as Entry[];
  });

export const getEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: entry, error } = await context.supabase
      .from("entries")
      .select(ENTRY_COLUMNS)
      .eq("slug", data.slug.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry) return null;

    const { data: history } = await context.supabase
      .from("health_checks")
      .select("ok, status_code, latency_ms, error, checked_at")
      .eq("entry_id", (entry as Entry).id)
      .order("checked_at", { ascending: false })
      .limit(20);

    return { entry: entry as Entry, history: history ?? [] };
  });

/** Entries submitted by the signed-in user, whatever their status. */
export const listMySubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("entries")
      .select(ENTRY_COLUMNS)
      .eq("submitted_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Entry[];
  });

export const submitEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => submitInput.parse(input))
  .handler(async ({ data, context }) => {
    const base = slugify(`${data.name}-${data.category}`) || `entry-${Date.now()}`;
    let slug = base;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: row, error } = await context.supabase
        .from("entries")
        .insert({
          slug,
          name: data.name,
          category: data.category,
          summary: data.summary,
          description: data.description ?? "",
          auth_mode: data.auth_mode,
          endpoint: data.endpoint,
          docs_url: data.docs_url,
          tags: data.tags ?? [],
          submitted_by: context.userId,
        })
        .select("slug, status")
        .single();

      if (!error) return row as { slug: string; status: string };
      if (error.code === "23505") {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      throw new Error(error.message);
    }
    throw new Error("Could not allocate a unique slug for this entry.");
  });

/** Whether the signed-in user is an admin (checked server-side, via RLS-safe RPC). */
export const getMyAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId,
      isAdmin: Boolean(isAdmin),
      displayName: (profile as { display_name?: string } | null)?.display_name ?? "",
    };
  });

export const listModerationQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("entries")
      .select(ENTRY_COLUMNS)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Entry[];
  });

export const moderateEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("entries")
      .update({
        status: data.decision,
        review_note: data.note || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Admin-only: probe approved endpoints now and persist the results. */
export const runHealthChecksNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { runHealthChecks } = await import("@/lib/health.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return await runHealthChecks(supabaseAdmin as never, 50);
  });
