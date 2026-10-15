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
        const url = new URL(request.url);
        const confirm = url.searchParams.get("confirm");
        if (confirm) {
          if (!/^[a-f0-9]{20,64}$/.test(confirm)) {
            return new Response("<p style='font-family:sans-serif'>This confirmation link is not valid.</p>", {
              headers: { "Content-Type": "text/html" },
            });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const admin = supabaseAdmin as any;
          const { data: watch } = await admin
            .from("tool_watches")
            .select("id, confirmed_at")
            .eq("confirm_token", confirm)
            .maybeSingle();
          if (!watch) {
            return new Response(
              "<p style='font-family:sans-serif'>This confirmation link is no longer valid. Follow the tool again to get a new one.</p>",
              { headers: { "Content-Type": "text/html" } },
            );
          }
          if (!watch.confirmed_at) {
            await admin.from("tool_watches").update({ confirmed_at: new Date().toISOString() }).eq("id", watch.id);
          }
          return new Response("<p style='font-family:sans-serif'>Confirmed. Alerts for this tool will now reach this address.</p>", {
            headers: { "Content-Type": "text/html" },
          });
        }
        const token = url.searchParams.get("unsubscribe");
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

        const key = await resolveApiKey(request);
        // A key minted with an email already knows who to write to: don't make
        // the caller repeat the address on every single watch.
        const notifyEmail = email ?? key?.ownerEmail ?? null;
        if (!notifyEmail && !webhook_url) {
          return json({ error: "Provide an email or a webhook_url." }, 400);
        }
        if (webhook_url && key?.tier !== "pro") {
          return json({ error: "Webhooks are a Pro feature. Free accounts can follow by email.", upgrade: "https://agentnexus.app/pricing" }, 402);
        }
        const owner = key ? `key:${key.keyId}` : `email:${notifyEmail!.toLowerCase()}`;
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
        const { data: existing } = await admin
          .from("tool_watches")
          .select("id, confirmed_at")
          .eq("entry_id", entry.id)
          .eq("owner", owner)
          .maybeSingle();


        // Webhook watches belong to a Pro key: the caller is already verified,
        // so they start confirmed.
        if (webhook_url) {
          const { error } = await admin.from("tool_watches").upsert(
            {
              entry_id: entry.id,
              owner,
              email: notifyEmail,
              webhook_url,
              api_key_id: key?.keyId ?? null,
              last_state: state,
              confirmed_at: new Date().toISOString(),
            },
            { onConflict: "entry_id,owner" },
          );
          if (error) return json({ error: "Could not save" }, 500);
          return json({ ok: true, following: entry.slug, alerts_to: webhook_url, alerts_on: ["down", "back up", "schema drift", "tools/list change"], plan_limit: limit });
        }

        // Double opt-in for email watches: nobody can subscribe an address
        // without access to its inbox. Alerts only flow after confirmation.
        if (existing?.confirmed_at) {
          return json({ ok: true, following: entry.slug, alerts_to: notifyEmail, alerts_on: ["down", "back up", "schema drift", "tools/list change"], plan_limit: limit });
        }
        const confirmToken = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
        const { data: saved, error } = await admin
          .from("tool_watches")
          .upsert(
            {
              entry_id: entry.id,
              owner,
              email: notifyEmail,
              webhook_url: null,
              api_key_id: key?.keyId ?? null,
              last_state: state,
              confirm_token: confirmToken,
              confirmed_at: null,
            },
            { onConflict: "entry_id,owner" },
          )
          .select("id")
          .single();
        if (error) return json({ error: "Could not save" }, 500);
        try {
          const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
          await sendTemplateEmail("watch-confirmation", notifyEmail!, {
            idempotencyKey: `watch-confirm:${saved.id}:${confirmToken}`,
            templateData: {
              entryName: entry.name,
              confirmUrl: `https://agentnexus.app/api/public/watch?confirm=${confirmToken}`,
            },
          });
        } catch (error) {
          console.error("watch confirmation email failed", error);
        }
        return json({
          ok: true,
          following: entry.slug,
          alerts_to: notifyEmail,
          alerts_on: ["down", "back up", "schema drift", "tools/list change"],
          confirmation_required: true,
          note: "Check the inbox of this address and confirm: alerts start after confirmation.",
          plan_limit: limit,
        });
      },
    },
  },
});
