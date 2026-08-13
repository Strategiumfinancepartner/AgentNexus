import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CATEGORIES = ["api", "mcp", "cli"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Entry = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  summary: string;
  description: string;
  auth_mode: string;
  endpoint: string;
  docs_url: string | null;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  submitted_by: string | null;
  review_note: string | null;
  health_ok: boolean | null;
  health_status_code: number | null;
  health_latency_ms: number | null;
  health_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

const ENTRY_COLUMNS =
  "id, slug, name, category, summary, description, auth_mode, endpoint, docs_url, tags, status, submitted_by, review_note, health_ok, health_status_code, health_latency_ms, health_checked_at, created_at, updated_at";

const listInput = z.object({
  search: z.string().trim().max(120).optional().default(""),
  category: z.enum(["all", ...CATEGORIES]).optional().default("all"),
});

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

const submitInput = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(4000).optional().default(""),
  auth_mode: z.string().trim().min(1).max(120),
  endpoint: z.string().trim().min(1).max(500),
  docs_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().default([]),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

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

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}

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
