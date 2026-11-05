import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);

async function authorize(context: { supabase: any; userId: string }, slug: string) {
  const [{ data: isAdmin }, { data: own }] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.from("entries").select("id").eq("slug", slug).eq("submitted_by", context.userId).maybeSingle(),
  ]);
  if (!isAdmin && !own) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: entry } = await supabaseAdmin.from("entries").select("id, slug, name, submitted_by").eq("slug", slug).maybeSingle();
  if (!entry) return null;
  const { isLivePublisher } = await import("./publisher-alerts.server");
  const publisher = await isLivePublisher(supabaseAdmin as never, entry.submitted_by);
  return { admin: supabaseAdmin, entry, publisher, isAdmin: !!isAdmin };
}

export type AlertSettingsView = {
  allowed: boolean;
  publisher: boolean;
  canEdit: boolean;
  settings: null | { alert_outage: boolean; alert_schema: boolean; alert_data: boolean; stale_hours: number; min_volume: number | null; drop_percent: number; email: string | null; webhook_url: string | null; webhook_secret: string };
  history: { created_at: string; channel: string; target: string; status: string; attempts: number; last_error: string | null; changes: string[] }[];
};

export const getAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data, context }): Promise<AlertSettingsView> => {
    const a = await authorize(context, data.slug);
    if (!a) return { allowed: false, publisher: false, canEdit: false, settings: null, history: [] };
    const [{ data: s }, { data: h }] = await Promise.all([
      a.admin.from("entry_alert_settings").select("alert_outage, alert_schema, alert_data, stale_hours, min_volume, drop_percent, email, webhook_url, webhook_secret").eq("entry_id", a.entry.id).maybeSingle(),
      a.admin.from("watch_deliveries").select("created_at, channel, target, status, attempts, last_error, payload").eq("entry_id", a.entry.id).eq("audience", "publisher").order("created_at", { ascending: false }).limit(30),
    ]);
    return {
      allowed: true, publisher: a.publisher, canEdit: a.publisher || a.isAdmin, settings: (s as AlertSettingsView["settings"]) ?? null,
      history: (h ?? []).map((r: any) => ({ created_at: r.created_at, channel: r.channel, target: r.target, status: r.status, attempts: r.attempts, last_error: r.last_error, changes: Array.isArray(r.payload?.changes) ? r.payload.changes : Array.isArray(r.payload?.templateData?.changes) ? r.payload.templateData.changes : [] })),
    };
  });

export const saveAlertSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    slug: slugSchema,
    alert_outage: z.boolean(), alert_schema: z.boolean(), alert_data: z.boolean(),
    stale_hours: z.number().int().min(1).max(720),
    min_volume: z.number().int().min(0).max(1_000_000_000).nullable(),
    drop_percent: z.number().int().min(10).max(100).default(80),
    email: z.string().trim().email().max(255).nullable(),
    webhook_url: z.string().trim().url().max(500).startsWith("https://").nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await authorize(context, data.slug);
    if (!a) throw new Error("Not allowed");
    if (!a.publisher && !a.isAdmin) throw new Error("Alerts require the Publisher plan");
    const { slug, ...fields } = data;
    const { error } = await a.admin.from("entry_alert_settings").upsert({ entry_id: a.entry.id, ...fields, last_state: null, updated_at: new Date().toISOString() }, { onConflict: "entry_id" });
    if (error) throw new Error("Could not save");
    return { ok: true };
  });

export const sendTestAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const a = await authorize(context, data.slug);
    if (!a) throw new Error("Not allowed");
    if (!a.publisher && !a.isAdmin) throw new Error("Alerts require the Publisher plan");
    const { data: s } = await a.admin.from("entry_alert_settings").select("*").eq("entry_id", a.entry.id).maybeSingle();
    if (!s) throw new Error("Save your alert settings first");
    const { sendPublisherAlert } = await import("./publisher-alerts.server");
    const results = await sendPublisherAlert(a.admin as never, a.entry, s, ["TEST: this is a test alert from Agent Nexus"], "test", true, (context.claims as { email?: string })?.email ?? (await a.admin.auth.admin.getUserById(context.userId)).data.user?.email ?? null);
    return { sent: results.filter(Boolean).length, total: results.length };
  });
