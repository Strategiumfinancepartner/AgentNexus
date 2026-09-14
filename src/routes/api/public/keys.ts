import { createFileRoute } from "@tanstack/react-router";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { consumeRateLimit, requestActor } from "@/lib/telemetry.server";
import { QUOTA_LIMITS } from "@/lib/quota.server";

/**
 * Machine self-registration.
 *
 * An autonomous agent can mint its own free key with a single POST — no human,
 * no email, no dashboard. Abuse is bounded by an IP rate limit (a handful of
 * keys per day) and by the free tier's daily call quota; the key carries no
 * write capability beyond what an anonymous caller already has.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const bodySchema = z.object({
  agent: z.string().trim().max(80).optional(),
  purpose: z.string().trim().max(200).optional(),
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: cors });
}

export const Route = createFileRoute("/api/public/keys")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),

      GET: async ({ request }) =>
        json({
          endpoint: `${new URL(request.url).origin}/api/public/keys`,
          method: "POST",
          body: { agent: "your-agent-name", purpose: "what you plan to use the registry for" },
          returns: {
            key: "nx_… (shown once, store it)",
            tier: "free",
            daily_limit: QUOTA_LIMITS.free,
          },
          usage: "Send the key as the x-api-key header on any /api/public/* request.",
          limits: `Anonymous: ${QUOTA_LIMITS.anon} calls/day. Free key: ${QUOTA_LIMITS.free}. Agent Pro: ${QUOTA_LIMITS.pro}.`,
        }),

      POST: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const actor = requestActor(request);

        const ok = await consumeRateLimit("agent_key_registration", actor, 5, 86_400);
        if (!ok) {
          return json(
            {
              error: "Key registration rate limit reached",
              detail: "Up to 5 self-service keys per source per 24h.",
              reuse: "Store and reuse the key you already received.",
              pricing_url: `${origin}/pricing`,
            },
            429,
          );
        }

        let payload: unknown = {};
        try {
          const text = await request.text();
          payload = text ? JSON.parse(text) : {};
        } catch {
          return json({ error: "Body must be JSON or empty" }, 400);
        }

        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) {
          return json({ error: "Invalid body", fields: ["agent", "purpose"] }, 400);
        }

        const key = `nx_${randomBytes(24).toString("hex")}`;
        const label = [parsed.data.agent, parsed.data.purpose].filter(Boolean).join(" — ").slice(0, 200);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await (supabaseAdmin as any).from("api_keys").insert({
          user_id: null,
          kind: "agent",
          name: parsed.data.agent?.slice(0, 60) || "autonomous agent",
          agent_label: label,
          key_prefix: key.slice(0, 11),
          key_hash: createHash("sha256").update(key).digest("hex"),
        });

        if (error) return json({ error: "Could not issue a key right now" }, 502);

        return json({
          key,
          tier: "free",
          daily_limit: QUOTA_LIMITS.free,
          header: "x-api-key",
          store_it: "This key is shown once and cannot be recovered.",
          next: {
            discover: `${origin}/api/public/discover?need=<what+you+want+to+do>`,
            mcp_read_only: `${origin}/api/public/mcp`,
            catalog: `${origin}/api/public/entries.ndjson`,
            report_back: `${origin}/api/public/report`,
          },
          upgrade: `${origin}/pricing`,
        });
      },
    },
  },
});
