export const CHECKOUT_SYNC_TIMEOUT_MS = 120_000;

/** A return URL is only an intent; paid access must come from the server. */
export function checkoutSyncState(expected: boolean, tier: string | undefined, elapsedMs: number) {
  if (!expected || tier === "pro") return "ready";
  return elapsedMs >= CHECKOUT_SYNC_TIMEOUT_MS ? "delayed" : "pending";
}