import { createFileRoute } from "@tanstack/react-router";
import { supabaseAnon } from "@/lib/mcp/supabase";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://agentnexus.app";
        const { data } = await supabaseAnon()
          .from("entries")
          .select("slug, created_at, updated_at")
          .eq("status", "approved")
          .limit(2000);

        const staticPaths = [
          "/",
          "/explore",
          "/status",
          "/best-email-apis",
          "/best-linkedin-apis",
          "/is-down",
          "/connect",
          "/pricing",
          "/free-key",
          "/terms",
          "/refunds",
          "/privacy",
        ];
        // Page-specific content dates; only set when that page's content really changed.
        const STATIC_LASTMOD: Record<string, string> = { "/pricing": "2026-10-21" };
        const urls = [
          ...staticPaths.map(
            (p) =>
              `<url><loc>${origin}${p}</loc>${STATIC_LASTMOD[p] ? `<lastmod>${STATIC_LASTMOD[p]}</lastmod>` : ""}<changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : "0.8"}</priority></url>`,
          ),
          ...((data ?? []) as { slug: string; created_at: string; updated_at: string | null }[]).flatMap(
            (e) => {
              const lastmod = new Date(e.updated_at ?? e.created_at).toISOString();
              return [
                `<url><loc>${origin}/registry/${e.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
                `<url><loc>${origin}/is-down/${e.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`,
              ];
            },
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
