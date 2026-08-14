import { createFileRoute } from "@tanstack/react-router";
import { runIngest } from "@/lib/ingest.server";
import { authorizeOpsRequest, jsonHeaders } from "@/lib/cron-auth.server";

/**
 * Bulk ingest of the curated bootstrap catalog.
 * `Authorization: Bearer $CRON_SECRET`; `?dry_run=1` to preview.
 */
export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await authorizeOpsRequest(request))) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: jsonHeaders,
          });
        }
        const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const summary = await runIngest(supabaseAdmin as never, { dryRun });
        return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...summary }), {
          headers: jsonHeaders,
        });
      },
    },
  },
});
