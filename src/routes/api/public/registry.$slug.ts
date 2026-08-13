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

        const { data, error } = await supabaseAnon()
          .from("entries")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .eq("slug", parsed.data.toLowerCase())
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: "Registry unavailable" }), {
            status: 502,
            headers: cors,
          });
        }
        if (!data) {
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
