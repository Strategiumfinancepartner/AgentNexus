import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Runs the real discovery engine against the live registry for a demo page. Public, read-only. */
export const runDemo = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { demoBySlug } = await import("@/lib/demos");
    const demo = demoBySlug(data.slug);
    if (!demo) return null;
    const { PUBLIC_COLUMNS, supabaseAnon } = await import("@/lib/mcp/supabase");
    const { buildDiscovery, needTokens } = await import("@/lib/registry-core");
    let q = supabaseAnon().from("entries").select(PUBLIC_COLUMNS).eq("status", "approved").limit(2000);
    if (demo.category) q = q.eq("category", demo.category);
    const { data: rows, error } = await q;
    if (error) return { fetchedAt: new Date().toISOString(), error: "Registry temporarily unavailable", result: null };
    const result = buildDiscovery((rows ?? []) as any[], { need: demo.need, tokens: needTokens(demo.need), category: demo.category ?? null, limit: demo.limit });
    return { fetchedAt: new Date().toISOString(), error: null, result: JSON.parse(JSON.stringify(result)) as any };
  });
