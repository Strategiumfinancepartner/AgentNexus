export const AUTH_INTENT_KEY = "agentnexus.auth-intent";
const MAX_AGE = 60 * 60 * 1000;

export function safeAuthPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\/(?!\/)/.test(value) || /[\\\r\n]/.test(value)) return undefined;
  return value;
}

export function readAuthIntent(storage: Pick<Storage, "getItem">, now = Date.now()): string | undefined {
  try {
    const raw = JSON.parse(storage.getItem(AUTH_INTENT_KEY) ?? "null");
    return raw && typeof raw.at === "number" && now >= raw.at && now - raw.at <= MAX_AGE ? safeAuthPath(raw.path) : undefined;
  } catch { return undefined; }
}

export function rememberAuthIntent(path: string | undefined) {
  try {
    const safe = safeAuthPath(path);
    if (safe) sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify({ path: safe, at: Date.now() }));
  } catch { /* URL remains the fallback when storage is unavailable. */ }
}

export function clearAuthIntent() {
  try { sessionStorage.removeItem(AUTH_INTENT_KEY); } catch { /* unavailable */ }
}