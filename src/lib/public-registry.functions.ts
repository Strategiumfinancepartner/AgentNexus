import { createServerFn } from "@tanstack/react-start";

export type PublicEntry = {
  slug: string;
  name: string;
  category: "api" | "mcp" | "cli";
  summary: string;
  auth_mode: string;
  endpoint: string;
  docs_url: string | null;
  tags: string[];
  health_ok: boolean | null;
  health_checked_at: string | null;
  health_latency_ms: number | null;
  probe_url: string | null;
};

export type PublicCatalog = {
  entries: PublicEntry[];
  counts: { all: number; api: number; mcp: number; cli: number };
  health: { up: number; down: number; unknown: number };
};

/** Public, unauthenticated read of the approved catalog (RLS runs as anon). */
export const getPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCatalog> => {
    const { PUBLIC_COLUMNS, supabaseAnon } = await import("@/lib/mcp/supabase");
    const { data, error } = await supabaseAnon()
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(200);

    const entries = (error ? [] : ((data ?? []) as unknown as PublicEntry[])) as PublicEntry[];
    const counts = {
      all: entries.length,
      api: entries.filter((e) => e.category === "api").length,
      mcp: entries.filter((e) => e.category === "mcp").length,
      cli: entries.filter((e) => e.category === "cli").length,
    };
    const health = {
      up: entries.filter((e) => e.health_ok === true).length,
      down: entries.filter((e) => e.health_ok === false).length,
      unknown: entries.filter((e) => e.health_ok === null).length,
    };
    return { entries, counts, health };
  },
);

export type PublicEntryDetail = PublicEntry & {
  description: string;
  capabilities: string[];
  input_format: string;
  output_format: string;
  rate_limit: string;
  pricing: string;
  invocation_example: string;
  verified: boolean;
  featured: boolean;
  checks_total: number;
  checks_ok: number;
  avg_latency_ms: number | null;
};

/** Public read of a single approved entry — powers the indexable detail page. */
export const getPublicEntry = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/i.test(slug)) {
      throw new Error("Invalid slug");
    }
    return { slug: slug.toLowerCase() };
  })
  .handler(async ({ data }): Promise<PublicEntryDetail | { redirectTo: string } | null> => {
    const { PUBLIC_COLUMNS, supabaseAnon } = await import("@/lib/mcp/supabase");
    const client = supabaseAnon();
    const { data: row, error } = await client
      .from("entries")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!error && row) return row as unknown as PublicEntryDetail;

    // Retired duplicate slug → tell the caller where the canonical entry lives.
    const { data: alias } = await client
      .from("entry_aliases")
      .select("to_slug")
      .eq("from_slug", data.slug)
      .maybeSingle();
    if (alias?.to_slug) return { redirectTo: alias.to_slug as string };
    return null;
  });
