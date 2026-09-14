/**
 * Access log for the public agent surfaces.
 *
 * Every machine-facing entry point (/mcp, /llms.txt, /agents.txt, the public
 * JSON APIs, the well-known manifests) is recorded through a SECURITY DEFINER
 * function so no client can read or forge the log. Human HTML pages are not
 * logged.
 *
 * Best-effort by design: a logging failure must never break discovery.
 */

import { createHash } from "crypto";

export type SurfaceMatch = { surface: string };

const EXACT: Record<string, string> = {
  "/mcp": "mcp",
  "/llms.txt": "llms.txt",
  "/agents.txt": "agents.txt",
  "/openapi.json": "openapi.json",
  "/server.json": "server.json",
  "/feed.xml": "feed.xml",
  "/sitemap.xml": "sitemap.xml",
  "/robots.txt": "robots.txt",
  "/api/public/discover": "discover",
  "/api/public/registry": "registry",
  "/api/public/capabilities": "capabilities",
  "/api/public/entries.ndjson": "entries.ndjson",
  "/api/public/status": "status",
  "/api/public/report": "report",
  "/api/public/ingest": "ingest",
};

/** Maps a request path to a loggable surface name, or null to skip logging. */
export function surfaceFor(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (EXACT[path]) return EXACT[path];
  if (path.startsWith("/mcp/")) return "mcp";
  if (path.startsWith("/api/public/registry/")) return "registry.entry";
  if (path.startsWith("/.well-known/")) return `well-known${path.slice("/.well-known".length)}`;
  return null;
}

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

function rawKey(request: Request, url: URL): string | null {
  const header = request.headers.get("x-api-key")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (/^bearer\s+nx_/i.test(auth)) return auth.replace(/^bearer\s+/i, "").trim();
  return url.searchParams.get("key")?.trim() || null;
}

/** Records one hit on a machine-facing surface. Never throws. */
export async function logAccess(request: Request, surface: string): Promise<void> {
  try {
    const url = new URL(request.url);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as unknown as {
      from: (table: string) => any;
      rpc: (fn: string, args: unknown) => any;
    };

    let tier = "anon";
    let actor = `ip:${sha256(callerIp(request.headers)).slice(0, 32)}`;
    let apiKeyId: string | null = null;
    let userId: string | null = null;

    const key = rawKey(request, url);
    if (key) {
      const { data } = await client
        .from("api_keys")
        .select("id, user_id, revoked_at")
        .eq("key_hash", sha256(key))
        .maybeSingle();
      if (data && !data.revoked_at) {
        apiKeyId = data.id;
        userId = data.user_id;
        actor = `key:${data.id}`;
        tier = "free";
        for (const env of ["live", "sandbox"] as const) {
          const { data: active } = await client.rpc("has_active_subscription", {
            user_uuid: data.user_id,
            check_env: env,
          });
          if (active === true) {
            tier = "pro";
            break;
          }
        }
      }
    }

    await client.rpc("record_access_event", {
      _surface: surface,
      _path: url.pathname,
      _method: request.method,
      _tier: tier,
      _actor: actor,
      _api_key_id: apiKeyId,
      _user_id: userId,
      _user_agent: request.headers.get("user-agent") ?? "",
      _referer: request.headers.get("referer") ?? "",
      _country: request.headers.get("cf-ipcountry") ?? "",
    });
  } catch {
    // swallow — telemetry must not break discovery
  }
}
