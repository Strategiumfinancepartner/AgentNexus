import { createFileRoute } from "@tanstack/react-router";
import { runHealthChecks } from "@/lib/health.server";
import { authorizeOpsRequest, jsonHeaders } from "@/lib/cron-auth.server";

/**
 * Scheduled probe run. Called every 6 hours by the database scheduler, and
 * callable manually with `Authorization: Bearer $CRON_SECRET`.
 */
export const Route = createFileRoute("/api/public/health-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await authorizeOpsRequest(request))) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: jsonHeaders,
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const summary = await runHealthChecks(supabaseAdmin as never, 40);

        // Publisher plan benefits are reconciled right after the probes, so a
        // new subscriber is featured/verified within one cycle and a lapsed one
        // loses placement without anyone touching the registry by hand.
        const { syncPublisherEntitlements } = await import("@/lib/publisher-entitlements.server");
        let entitlements: unknown = null;
        try {
          entitlements = await syncPublisherEntitlements(supabaseAdmin as never);
        } catch (error) {
          console.error("publisher entitlement sync failed", error);
        }

        return new Response(JSON.stringify({ success: true, ...summary, entitlements }), {
          headers: jsonHeaders,
        });
      },
    },
  },
});
