import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildEntryReport, type EntryReport } from "@/lib/entry-report";

const DAYS = 30;

/** Report for one entry; visible only to its submitter or a reviewer. */
export const getEntryReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().regex(/^[a-z0-9-]{1,80}$/) }).parse(d))
  .handler(async ({ data, context }): Promise<{ allowed: false } | { allowed: true; report: EntryReport; watchers: number; reports: number }> => {
    const [{ data: isAdmin }, { data: isMod }, { data: own }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
      context.supabase.from("entries").select("id").eq("slug", data.slug).eq("submitted_by", context.userId).maybeSingle(),
    ]);
    if (!isAdmin && !isMod && !own) return { allowed: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - DAYS * 86400_000).toISOString();
    const { data: entry } = await supabaseAdmin.from("entries").select("id").eq("slug", data.slug).maybeSingle();

    const opens: { actor: string; user_agent: string; created_at: string }[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data: page } = await supabaseAdmin
        .from("access_events")
        .select("actor, user_agent, created_at")
        .gte("created_at", since)
        .or(`path.eq./api/public/registry/${data.slug},path.like.*get_entry?slug=${data.slug}`)
        .range(from, from + 999);
      opens.push(...(page ?? []));
      if (!page || page.length < 1000) break;
    }
    const { data: apps } = await supabaseAdmin
      .from("entry_appearances")
      .select("source, created_at")
      .eq("entry_slug", data.slug)
      .gte("created_at", since)
      .limit(20000);

    let watchers = 0, reports = 0;
    if (entry) {
      const [w, r] = await Promise.all([
        supabaseAdmin.from("tool_watches").select("id", { count: "exact", head: true }).eq("entry_id", entry.id),
        supabaseAdmin.from("invocation_reports").select("id", { count: "exact", head: true }).eq("entry_id", entry.id).gte("created_at", since),
      ]);
      watchers = w.count ?? 0;
      reports = r.count ?? 0;
    }
    return { allowed: true, report: buildEntryReport(opens, apps ?? [], DAYS), watchers, reports };
  });
