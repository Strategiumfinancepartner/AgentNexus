import { createFileRoute } from "@tanstack/react-router";

/** Root alias: agents request /entries.ndjson directly — redirect to the public API. */
export const Route = createFileRoute("/entries.ndjson")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(null, {
          status: 308,
          headers: { Location: `${origin}/api/public/entries.ndjson` },
        });
      },
    },
  },
});
