import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PUBLIC_COLUMNS, supabaseAnon } from "@/lib/mcp/supabase";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=60",
};

const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/i);

/** Agents copy slugs out of prose and docs, so they arrive wrapped in
 * punctuation ("stripe-mcp):", "context7-mcp.") or still templated
 * ("{slug}"). Clean the obvious cases instead of answering a bare 400. */
function cleanSlug(raw: string): string {
  return decodeURIComponent(raw)
    .trim()
    .replace(/^[["'`(<]+/, "")
    .replace(/[\]"'`).,;:>]+$/, "")
    .toLowerCase();
}

const TEMPLATE = /^\{?(slug|entry|id|name)\}?$/;
const LIST_WORDS = new Set([
  "entries",
  "all",
  "any",
  "list",
  "index",
  "catalog",
  "catalogue",
  "*",
  "**",
  ":slug",
  "<slug>",
]);

const serveEntry = async ({
        params,
        request,
      }: {
        params: { slug: string };
        request: Request;
      }) => {
        const origin = new URL(request.url).origin;
        const cleaned = cleanSlug(params.slug);

        // An unfilled `{slug}` template is a crawler copying our docs, not a
        // bad request. Redirect to the full list so the call succeeds.
        if (TEMPLATE.test(cleaned)) {
          return new Response(null, {
            status: 308,
            headers: { ...cors, Location: `/api/public/registry` },
          });
        }

        if (LIST_WORDS.has(cleaned)) {
          return new Response(null, {
            status: 308,
            headers: { ...cors, Location: `/api/public/registry` },
          });
        }

        const parsed = slugSchema.safeParse(cleaned);
        if (!parsed.success) {
          return new Response(
            JSON.stringify(
              {
                error: "Invalid slug",
                hint: "Slugs are lowercase letters, digits and hyphens.",
                list: `${origin}/api/public/registry`,
                search: `${origin}/api/public/discover?need=what%20you%20want%20to%20do`,
              },
              null,
              2,
            ),
            { status: 400, headers: cors },
          );
        }

        const slug = parsed.data.toLowerCase();
        if (slug !== decodeURIComponent(params.slug).toLowerCase()) {
          return new Response(null, {
            status: 301,
            headers: { ...cors, Location: `/api/public/registry/${slug}` },
          });
        }
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
          // Agents drop our type suffix ("smtp2go" for smtp2go-api). When exactly
          // one entry is `<slug>-<suffix>`, send them there instead of a 404.
          const { data: suffixed } = await client
            .from("entries")
            .select("slug")
            .eq("status", "approved")
            .like("slug", `${slug}-%`)
            .limit(2);
          if (suffixed && suffixed.length === 1) {
            return new Response(null, {
              status: 301,
              headers: { ...cors, Location: `/api/public/registry/${suffixed[0]!.slug}` },
            });
          }
          // A miss is often a publisher looking for its own server. Answer with
          // near matches and the self-serve way in, not a bare 404.
          const needle = slug.split("-").filter((t) => t.length > 3)[0] ?? slug;
          const { data: near } = await client
            .from("entries")
            .select("slug, name")
            .eq("status", "approved")
            .ilike("slug", `%${needle}%`)
            .limit(5);
          return new Response(
            JSON.stringify(
              {
                error: "Not found",
                slug,
                did_you_mean: (near ?? []).map((n: { slug: string }) => n.slug),
                search: `${origin}/api/public/discover?need=${encodeURIComponent(slug.replace(/-/g, " "))}`,
                list: `${origin}/api/public/registry`,
                not_listed_yet: {
                  hint: "If this is your own interface, submit it — free, no account needed.",
                  step_1: `POST ${origin}/api/public/keys with {"agent":"your-name","purpose":"submit my server"}`,
                  step_2: `POST ${origin}/mcp with the x-api-key header and tools/call submit_entry`,
                  review: "A human approves every entry before it becomes discoverable.",
                },
              },
              null,
              2,
            ),
            { status: 404, headers: cors },
          );
        }
        return new Response(JSON.stringify({ entry: data }), { headers: cors });
};

export const Route = createFileRoute("/api/public/registry/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      // Crawlers probe read endpoints with POST/HEAD; answer the entry anyway
      // instead of letting the router fail the call.
      GET: async (ctx: any) => serveEntry(ctx),
      HEAD: async (ctx: any) => serveEntry(ctx),
      POST: async (ctx: any) => serveEntry(ctx),
    },
  },
});
