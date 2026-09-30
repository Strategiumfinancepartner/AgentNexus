import { createFileRoute } from "@tanstack/react-router";

/**
 * Submission tracker — lets a machine that submitted an entry check the
 * moderation decision without polling the catalogue (a pending or rejected
 * entry is invisible in the public registry, so a 404 there is ambiguous).
 *
 * Returns only the slug, the decision, the reviewer note and the public URL:
 * no submitter identity, no contact address.
 */
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization",
};

export const Route = createFileRoute("/api/public/submission")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const slug = url.searchParams.get("slug")?.trim().toLowerCase() ?? "";
        if (!slug || slug.length > 120) {
          // Bare crawler visits get usage, not an error (status 200 on purpose).
          return new Response(
            JSON.stringify({
              status: null,
              how_to_ask: "Pass ?slug=<your-listing-slug> — the slug returned when you submitted.",
              example: "/api/public/submission?slug=golemreach-mcp",
            }),
            { status: 200, headers },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin as any)
          .from("entries")
          .select("slug, name, category, status, review_note, created_at, reviewed_at")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: "Lookup failed" }), { status: 500, headers });
        }
        let entry: any = data;
        if (!entry) {
          // Submitters often guess the slug from their domain ("imagetourl.im")
          // or drop the "-api"/"-mcp" suffix: try those forms before giving up.
          const base = slug.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const candidates = [...new Set([base, `${base}-api`, `${base}-mcp`, `${base}-cli`])].filter((c) => c && c !== slug);
          if (candidates.length) {
            const { data: alt } = await (supabaseAdmin as any)
              .from("entries")
              .select("slug, name, category, status, review_note, created_at, reviewed_at")
              .in("slug", candidates)
              .limit(1);
            entry = alt?.[0] ?? null;
          }
        }
        if (!entry) {
          // Unknown slug is an answer, not a server fault: 200 with guidance.
          return new Response(
            JSON.stringify({
              slug,
              status: "not_found",
              explanation: "No submission with this slug. Use the exact slug returned by submit_entry (usually ends in -api, -mcp or -cli).",
              example: "/api/public/submission?slug=golemreach-mcp",
            }),
            { status: 200, headers },
          );
        }

        const status = entry.status as "pending" | "approved" | "rejected";
        const explain =
          status === "approved"
            ? "Live: discoverable through /mcp, /api/public/discover and the bulk export."
            : status === "rejected"
              ? "Not added. Fix the point in review_note and submit again."
              : "Waiting for a human reviewer. Nothing else is required from you.";

        return new Response(
          JSON.stringify({
            slug: entry.slug,
            name: entry.name,
            category: entry.category,
            status,
            explanation: explain,
            review_note: entry.review_note ?? "",
            submitted_at: entry.created_at,
            reviewed_at: entry.reviewed_at,
            entry_url: status === "approved" ? `https://agentnexus.app/entry/${entry.slug}` : null,
            publisher_plan: "https://agentnexus.app/pricing",
          }),
          { headers },
        );
      },
    },
  },
});
