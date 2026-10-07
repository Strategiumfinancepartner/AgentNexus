import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { consumeRateLimit, requestActor } from "@/lib/telemetry.server";
import { resolveApiKey } from "@/lib/quota.server";
import { FREE_WATCH_LIMIT, PRO_WATCH_LIMIT, watchState } from "@/lib/watch.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200).optional(),
  webhook_url: z.string().trim().url().max(500).startsWith("https://").optional(),
});

/** Follow a tool: get an email or webhook when it goes down, comes back,
 * or changes shape (response schema or advertised tool list). */
export const Route = createFileRoute("/api/public/watch")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("unsubscribe");
        if (!token || !/^[a-f0-9]{20,64}$/.test(token)) {
          return json({
            usage: "POST {slug, email?} or {slug, webhook_url} with x-api-key. Free: 3 tools. Pro: 100 tools + webhooks.",
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await (supabaseAdmin as any).from("tool_watches").delete().eq("unsubscribe_token", token);
        return new Response("<p style='font-family:sans-serif'>You will no longer receive these alerts.</p>", {
          headers: { "Content-Type": "text/html" },
        });
      },
      POST: async ({ request }) => {
        if (!(await consumeRateLimit("watch", requestActor(request), 10, 3600))) {
          return json({ error: "Rate limit exceeded: 10 follows per hour." }, 429);
        }
        let parsed;
        try {
          parsed = bodySchema.safeParse(await request.json());
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!parsed.success) return json({ error: "Provide slug and an email or an https webhook_url." }, 400);
        const { slug, email, webhook_url } = parsed.data;
        if (!email && !webhook_url) return json({ error: "Provide an email or a webhook_url." }, 400);

        const key = await resolveApiKey(request);
        if (webhook_url && key?.tier !== "pro") {
          return json({ error: "Webhooks are a Pro feature. Free accounts can follow by email.", upgrade: "https://agentnexus.app/pricing" }, 402);
        }
        const owner = key ? `key:${key.keyId}` : `email:${email!.toLowerCase()}`;
        const limit = key?.tier === "pro" ? PRO_WATCH_LIMIT : FREE_WATCH_LIMIT;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const { data: entry } = await admin
          .from("entries")
          .select("id, slug, name, health_ok, schema_ok, discovered_tools")
          .eq("slug", slug.toLowerCase())
          .eq("status", "approved")
          .maybeSingle();
        if (!entry) return json({ error: "Unknown tool" }, 404);

        const { count } = await admin
          .from("tool_watches")
          .select("id", { count: "exact", head: true })
          .eq("owner", owner);
        if ((count ?? 0) >= limit) {
          return json({ error: `You already follow ${limit} tools, the limit of your plan.`, upgrade: "https://agentnexus.app/pricing" }, 402);
        }

        const state = await watchState({ up: entry.health_ok, schema_ok: entry.schema_ok, tools: entry.discovered_tools });
        const { error } = await admin.from("tool_watches").upsert(
          {
            entry_id: entry.id,
            owner,
            email: email?.toLowerCase() ?? null,
            webhook_url: webhook_url ?? null,
            api_key_id: key?.keyId ?? null,
            last_state: state,
          },
          { onConflict: "entry_id,owner" },
        );
        if (error) return json({ error: "Could not save" }, 500);
        return json({ ok: true, following: entry.slug, alerts_on: ["down", "back up", "schema drift", "tools/list change"], plan_limit: limit });
      },
    },
  },
});
