/** Records which entries were returned for a real search. Best-effort, never throws. */
export async function recordAppearances(
  slugs: Array<string | null | undefined>,
  source: "mcp_discover" | "mcp_search" | "http_discover",
): Promise<void> {
  try {
    const rows = slugs
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .slice(0, 20)
      .map((entry_slug, i) => ({ entry_slug, source, rank: i + 1 }));
    if (!rows.length) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("entry_appearances").insert(rows);
  } catch {
    // swallow: logging must never break discovery
  }
}
