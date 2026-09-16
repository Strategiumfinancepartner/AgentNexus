import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://agentnexus.app";
        const { data } = await supabaseAnon()
          .from("entries")
          .select("slug")
          .eq("status", "approved")
          .limit(2000);

        const staticPaths = [
          "/",
          "/explore",
          "/status",
          "/connect",
          "/pricing",
          "/terms",
          "/refunds",
          "/privacy",
        ];
        const urls = [
          ...staticPaths.map(
            (p) =>
              `<url><loc>${origin}${p}</loc><changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`,
          ),
          ...((data ?? []) as { slug: string }[]).map(
            (e) =>
              `<url><loc>${origin}/registry/${e.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
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
