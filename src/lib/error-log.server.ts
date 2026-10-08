/**
 * Failed-response log for the machine-facing surfaces.
 *
 * Deliberately separate from the access log: access_events answers "who reads
 * the registry", error_events answers "what did we hand back broken". Kept in
 * its own table so the dashboard can show an error counter that never mixes
 * with traffic volume.
 *
 * Best-effort: a logging failure must never alter the response.
 */

import { createHash } from "crypto";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function callerIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

function hasKey(request: Request, url: URL): boolean {
  if (request.headers.get("x-api-key")?.trim()) return true;
  if (/^bearer\s+nx_/i.test(request.headers.get("authorization")?.trim() ?? "")) return true;
  return Boolean(url.searchParams.get("key")?.trim());
}

/**
 * Protocol-level answers that are the correct behaviour, not a broken response.
 * The MCP gate challenges credential-less writes with 401 and refuses non-POST
 * transports with 405 by design — logging those as failures made the error
 * counter measure normal handshakes instead of things we actually served wrong.
 */
function isExpectedProtocolAnswer(surface: string, status: number, method: string): boolean {
  // Quota enforcement working as designed (audit crawlers hammer the gate in
  // bursts); it is a deliberate answer, not a response we got wrong.
  if (status === 429) return true;
  // Third-party registries probe for their own claim file (brick-blue.json,
  // did.json) and scanners fish for ftp/sftp configs. A 404 on a manifest we
  // never published is the correct answer.
  // 406 is the same "not published" answer when the crawler demands JSON only.
  if ((status === 404 || status === 406) && surface.startsWith("well-known/")) return true;
  if (surface !== "mcp") return false;
  if (status === 401) return true;
  if (status === 405 && method !== "POST") return true;
  return false;
}

/** Records one failed response (status >= 400) on a machine-facing surface. */
export async function logSurfaceError(
  request: Request,
  surface: string,
  status: number,
  detail = "",
): Promise<void> {
  try {
    if (isExpectedProtocolAnswer(surface, status, request.method)) return;
    const url = new URL(request.url);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as { rpc: (fn: string, args: unknown) => any };

    await client.rpc("record_error_event", {
      _surface: surface,
      _path: url.pathname,
      _method: request.method,
      _status: status,
      _tier: hasKey(request, url) ? "keyed" : "anon",
      _actor: `ip:${sha256(callerIp(request.headers)).slice(0, 32)}`,
      _user_agent: request.headers.get("user-agent") ?? "",
      _detail: detail,
    });
  } catch {
    // swallow — telemetry must not break discovery
  }
}
