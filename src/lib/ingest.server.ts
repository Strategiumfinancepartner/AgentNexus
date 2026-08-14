/** Bulk ingest of the curated bootstrap catalog. Service-role only. */

import { CATALOG, type CatalogEntry } from "@/lib/ingest/catalog";

type AdminClient = { from: (table: string) => any };

function row(entry: CatalogEntry) {
  return {
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    summary: entry.summary,
    description: entry.description ?? "",
    endpoint: entry.endpoint,
    docs_url: entry.docs_url ?? null,
    auth_mode: entry.auth_mode,
    auth_params: entry.auth_params ?? [],
    tags: entry.tags,
    capabilities: entry.capabilities,
    input_format: entry.input_format ?? "",
    output_format: entry.output_format ?? "",
    rate_limit: entry.rate_limit ?? "",
    pricing: entry.pricing ?? "",
    invocation_example: entry.invocation_example ?? "",
    verified: entry.verified ?? false,
    verified_at: entry.verified ? new Date().toISOString() : null,
    status: "approved" as const,
    source: "seed",
    updated_at: new Date().toISOString(),
  };
}

export type IngestSummary = { total: number; inserted: number; updated: number; failed: number };

/**
 * Upserts the curated catalog by slug. Community-submitted rows are never
 * touched: only entries whose `source` is `seed` (or brand-new slugs) are
 * written, so moderation decisions and human edits survive a re-run.
 */
export async function runIngest(
  supabaseAdmin: AdminClient,
  options: { dryRun?: boolean } = {},
): Promise<IngestSummary> {
  const slugs = CATALOG.map((entry) => entry.slug);
  const { data: existingRows, error } = await supabaseAdmin
    .from("entries")
    .select("slug, source")
    .in("slug", slugs);
  if (error) throw new Error(error.message);

  const existing = new Map<string, string>(
    ((existingRows ?? []) as { slug: string; source: string | null }[]).map((r) => [
      r.slug,
      r.source ?? "community",
    ]),
  );

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const entry of CATALOG) {
    const current = existing.get(entry.slug);
    if (current && current !== "seed") continue; // community-owned, leave alone
    if (options.dryRun) {
      current ? updated++ : inserted++;
      continue;
    }
    const { error: upsertError } = await supabaseAdmin
      .from("entries")
      .upsert(row(entry), { onConflict: "slug" });
    if (upsertError) {
      failed++;
      continue;
    }
    current ? updated++ : inserted++;
  }

  return { total: CATALOG.length, inserted, updated, failed };
}
