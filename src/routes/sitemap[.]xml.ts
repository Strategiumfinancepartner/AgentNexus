import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const { data } = await supabaseAnon()
          .from("entries")
          .select("slug, updated_at")
          .eq("status", "approved")
          .limit(2000);

        const staticPaths = ["/", "/explore", "/connect", "/pricing", "/auth"];
        const urls = [
          ...staticPaths.map(
            (p) =>
              `<url><loc>${origin}${p}</loc><changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`,
          ),
          ...((data ?? []) as { slug: string; updated_at: string }[]).map(
            (e) =>
              `<url><loc>${origin}/explore?entry=${e.slug}</loc><lastmod>${new Date(e.updated_at).toISOString().slice(0, 10)}</lastmod><priority>0.6</priority></url>`,
          ),
        ].join("");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } },
        );
      },
    },
  },
});
