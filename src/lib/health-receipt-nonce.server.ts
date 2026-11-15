/** Called only after the API-key principal has been verified. */
export async function reserveReceiptNonce(principal: string, nonce: string): Promise<boolean> {
  if (!principal.startsWith("key:")) throw new Error("Unverified receipt principal");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("reserve_health_receipt_nonce", { p_principal: principal, p_nonce_hash: hash });
  if (error || typeof data !== "boolean") throw new Error("Receipt nonce verification unavailable");
  return data;
}