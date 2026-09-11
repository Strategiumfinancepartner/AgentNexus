import { createFileRoute } from "@tanstack/react-router";
import { buildStatusPayload } from "@/lib/status.functions";

/** Public reliability history — no key, no account, CORS-open for agents. */
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export const Route = createFileRoute("/api/public/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug")?.trim().toLowerCase();
        const payload = await buildStatusPayload();
        if (slug) {
          const entry = payload.entries.find((e) => e.slug === slug);
          if (!entry) {
            return new Response(JSON.stringify({ error: "Unknown slug" }), {
              status: 404,
              headers,
            });
          }
          return new Response(
            JSON.stringify({
              generated_at: payload.generated_at,
              window_days: payload.window_days,
              entry,
              incidents: payload.incidents.filter((i) => i.slug === slug),
            }),
            { headers },
          );
        }
        return new Response(JSON.stringify(payload), { headers });
      },
    },
  },
});
