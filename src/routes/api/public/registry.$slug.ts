import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
};

const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/i);

export const Route = createFileRoute("/api/public/registry/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params }) => {
        const parsed = slugSchema.safeParse(params.slug);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid slug" }), {
            status: 400,
            headers: cors,
          });
        }

        const slug = parsed.data.toLowerCase();
        const client = supabaseAnon();
        const { data, error } = await client
          .from("entries")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers: cors,
          });
        }
        if (!data) {
          const { data: alias } = await client
            .from("entry_aliases")
            .select("to_slug")
            .eq("from_slug", slug)
            .maybeSingle();
          if (alias?.to_slug) {
            return new Response(null, {
              status: 301,
              headers: { ...cors, Location: `/api/public/registry/${alias.to_slug}` },
            });
          }
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: cors,
          });
        }
        return new Response(JSON.stringify({ entry: data }), { headers: cors });
      },
    },
  },
});
