import { createFileRoute } from "@tanstack/react-router";
import { runHealthChecks } from "@/lib/health.server";

/**
 * Cron endpoint. Requires `Authorization: Bearer $CRON_SECRET`.
 * Probes approved entries (oldest checked first) and stores the results.
 */
export const Route = createFileRoute("/api/public/health-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret) {
          return new Response(JSON.stringify({ error: "Not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        const provided = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        // constant-time-ish comparison
        const a = new TextEncoder().encode(provided);
        const b = new TextEncoder().encode(secret);
        let diff = a.length ^ b.length;
        for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
        if (diff !== 0) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const summary = await runHealthChecks(supabaseAdmin as never, 50);
        return new Response(JSON.stringify({ ok: true, ...summary }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
