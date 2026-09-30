/** Server-only health + capability probing for registry entries. */

import { hasPlaceholder, probeCapabilities } from "@/lib/capability-probe.server";
import { SCHEMA_PROFILES, runSchemaProbe, type SchemaProbe } from "@/lib/schema-probe.server";


export type ProbeResult = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

const TIMEOUT_MS = 8000;

/**
 * Only concrete http(s) endpoints are probeable. CLI entries are not network
 * endpoints, and templated URLs (`{baseId}`, `<project-ref>`) are not callable
 * as-is — probing them would report a fake outage.
 */
export function isProbeable(endpoint: string): boolean {
  const url = endpoint.trim();
  return /^https?:\/\//i.test(url) && !hasPlaceholder(url);
}

async function probeOnce(url: string): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const attempt = async (method: "HEAD" | "GET") =>
    fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "AgentNexus-HealthCheck/1.0" },
    });

  try {
    let response: Response;
    try {
      response = await attempt("HEAD");
      if (response.status === 405 || response.status === 501) response = await attempt("GET");
    } catch {
      response = await attempt("GET");
    }
    const latency = Date.now() - started;
    // Any answer below 500 proves the host is alive: 401/403 are correct gating,
    // and 404/405 on a REST base path simply means no handler at the root.
    const ok = response.status < 500;
    return {
      ok,
      status_code: response.status,
      latency_ms: latency,
      error: ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status_code: null,
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message.slice(0, 200) : "Request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One reported outage must mean a real outage. A single timeout or a one-off
 * 5xx from a busy public API flipped entries to "down" and made the registry
 * lie about interfaces that answer fine on the next call, so a failure is
 * confirmed with a second attempt (GET, short backoff) before we publish it.
 */
export async function probeEndpoint(endpoint: string): Promise<ProbeResult> {
  const url = endpoint.trim();
  if (!isProbeable(url)) {
    return { ok: false, status_code: null, latency_ms: null, error: "Not an HTTP endpoint" };
  }

  const first = await probeOnce(url);
  if (first.ok) return first;

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const second = await probeOnce(url);
  if (second.ok) return second;

  return {
    ...second,
    error: `${second.error ?? "Request failed"} (confirmed on 2 attempts)`,
  };
}

type EntryRow = {
  id: string;
  slug: string;
  endpoint: string;
  category: string;
  probe_url: string | null;
  docs_url: string | null;
};

/**
 * The URL we can actually ping for an entry: its endpoint when that is a
 * concrete http(s) URL, otherwise the curated fallback reference (package
 * registry, docs page) stored in `probe_url`.
 */
/**
 * Locally-run interfaces (`npx -y pkg`, `uvx pkg`, `docker run image`) have no
 * network endpoint, but the artifact they install does: the package registry
 * entry. Probing it answers the only liveness question that means anything for
 * a local command — can an agent still obtain it?
 */
function packageReference(command: string): string | null {
  const parts = command.trim().split(/\s+/).filter((p) => p && !p.startsWith("-"));
  const runner = parts[0]?.toLowerCase();
  if (!runner) return null;

  const firstPkg = (from: number) =>
    parts.slice(from).find((p) => !p.startsWith("<") && !p.startsWith("/") && !p.startsWith("."));

  if (runner === "npx" || runner === "npm") {
    const pkg = firstPkg(1)?.replace(/@[^@/]+$/, "");
    return pkg ? `https://registry.npmjs.org/${pkg}` : null;
  }
  if (runner === "uvx" || runner === "uv" || runner === "pipx" || runner === "pip") {
    const pkg = firstPkg(1)?.replace(/@.*$/, "");
    return pkg ? `https://pypi.org/pypi/${pkg}/json` : null;
  }
  if (runner === "docker") {
    const image = parts.slice(1).find((p) => p !== "run" && !p.startsWith("<"));
    if (!image) return null;
    const name = image.split(":")[0]!;
    const path = name.includes("/") ? name : `library/${name}`;
    return `https://hub.docker.com/v2/repositories/${path}`;
  }
  return null;
}

/**
 * The URL we can actually ping for an entry: its endpoint when that is a
 * concrete http(s) URL, otherwise the curated fallback reference (package
 * registry, docs page) stored in `probe_url`.
 */
export function probeTarget(row: { endpoint: string; probe_url?: string | null }) {
  // `probe_url` is a curated override: some endpoints reject datacenter probes
  // outright (WAF, auth-only routes), so a canonical liveness URL we picked by
  // hand is a truer signal than hammering the documented call path.
  const fallback = row.probe_url?.trim();
  if (fallback && isProbeable(fallback)) return { url: fallback, fallback: true };
  if (isProbeable(row.endpoint)) return { url: row.endpoint.trim(), fallback: false };

  const raw = row.endpoint.trim();
  // A templated endpoint (`/v1/items/{id}`) is not callable as-is, but its host
  // is: probing the origin still answers "is this service alive?" instead of
  // leaving the entry with no verdict forever. Self-hosted placeholders
  // (`https://<server>/...`) have no knowable host, so they stay unprobeable.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const sentinel = "nxplaceholder";
      const origin = new URL(raw.replace(/[<{][^>}]*[>}]/g, sentinel)).origin;
      const host = new URL(origin).hostname.toLowerCase();
      // A host that was itself a placeholder, or a private/local address, is not
      // reachable from here: no verdict is honest, a failed probe is a lie.
      const unreachable =
        host.includes(sentinel) ||
        host === "localhost" ||
        host.endsWith(".local") ||
        /^127\./.test(host) ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^0\./.test(host);
      if (!unreachable && isProbeable(origin)) return { url: origin, fallback: true };
    } catch {
      // unparseable — fall through
    }
    return null;
  }

  const pkg = packageReference(raw);
  if (pkg && isProbeable(pkg)) return { url: pkg, fallback: true };
  return null;
}

/**
 * Probes approved entries and persists results. Requires a service-role client.
 * Two layers per entry: liveness (is the host answering?) and capability
 * (does the interface expose the contract it claims?).
 */
export async function runHealthChecks(
  supabaseAdmin: {
    from: (table: string) => any;
  },
  limit = 50,
): Promise<{
  checked: number;
  ok: number;
  failed: number;
  skipped: number;
  capability_probed: number;
  capability_ok: number;
  schema_probed: number;
  schema_ok: number;
  schema_failed: number;
  docs_probed: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("entries")
    .select("id, slug, endpoint, category, probe_url, docs_url")
    .eq("status", "approved")
    .order("health_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EntryRow[];
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let capabilityProbed = 0;
  let capabilityOk = 0;
  let schemaProbed = 0;
  let schemaOk = 0;
  let schemaFailed = 0;
  let docsProbed = 0;

  for (const row of rows) {
    const target = probeTarget(row);
    const docs = row.docs_url?.trim();
    if (!target && docs && isProbeable(docs)) {
      // No callable address, but the publisher's documentation is reachable.
      // Recorded as a weaker "publisher reachable" signal (probe_kind 'docs'):
      // it never sets health_ok and never counts toward service uptime.
      const docsResult = await probeEndpoint(docs);
      docsProbed++;
      const checkedAt = new Date().toISOString();
      await supabaseAdmin.from("health_checks").insert({
        entry_id: row.id,
        ok: docsResult.ok,
        status_code: docsResult.status_code,
        latency_ms: docsResult.latency_ms,
        error: docsResult.error,
        checked_at: checkedAt,
        probe_kind: "docs",
      });
      await supabaseAdmin.from("entries").update({ health_checked_at: checkedAt }).eq("id", row.id);
      continue;
    }
    if (!target) {
      // Nothing pingable. Still stamp the row so the rotation moves on instead
      // of picking the same unprobeable entries on every run.
      skipped++;
      await supabaseAdmin
        .from("entries")
        .update({ health_checked_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }
    let result = await probeEndpoint(target.url);
    let viaReference = target.fallback;
    // Some public APIs rate-limit or block unattended probes on the data path
    // while the service itself is up. When a curated reference URL exists, it
    // decides the verdict instead of a hostile endpoint response.
    if (!result.ok && !target.fallback) {
      const reference = row.probe_url?.trim();
      if (reference && reference !== target.url && isProbeable(reference)) {
        const referenceResult = await probeEndpoint(reference);
        if (referenceResult.ok) {
          result = referenceResult;
          viaReference = true;
        }
      }
    }
    result.ok ? ok++ : failed++;

    const capability = await probeCapabilities(row);
    if (capability.probeable) {
      capabilityProbed++;
      if (capability.ok) capabilityOk++;
    }

    // Schema validation runs only for entries with a pinned documented
    // contract (AI APIs first) — see src/lib/schema-probe.server.ts.
    let schema: SchemaProbe | null = null;
    if (SCHEMA_PROFILES[row.slug]) {
      schema = await runSchemaProbe(row);
      if (schema.probeable) {
        schemaProbed++;
        if (schema.ok === true) schemaOk++;
        else if (schema.ok === false) schemaFailed++;
      }
    }

    const checkedAt = new Date().toISOString();
    await supabaseAdmin.from("health_checks").insert({
      entry_id: row.id,
      ok: result.ok,
      status_code: result.status_code,
      latency_ms: result.latency_ms,
      error: result.error,
      checked_at: checkedAt,
      probe_kind: viaReference ? "reference" : row.category === "mcp" ? "mcp" : "http",
    });

    const update: Record<string, unknown> = {
      health_ok: result.ok,
      health_status_code: result.status_code,
      health_latency_ms: result.latency_ms,
      health_checked_at: checkedAt,
    };
    if (capability.probeable) {
      update['capability_ok'] = capability.ok;
      update['capability_detail'] = capability.detail;
      update['capability_checked_at'] = checkedAt;
      if (capability.tools.length > 0) update['discovered_tools'] = capability.tools;
    }
    if (schema) {
      update['schema_ok'] = schema.ok;
      update['schema_detail'] = schema.detail;
      update['schema_checked_at'] = checkedAt;
    }
    await supabaseAdmin.from("entries").update(update).eq("id", row.id);
  }

  return {
    checked: ok + failed,
    ok,
    failed,
    skipped,
    capability_probed: capabilityProbed,
    capability_ok: capabilityOk,
    schema_probed: schemaProbed,
    schema_ok: schemaOk,
    schema_failed: schemaFailed,
    docs_probed: docsProbed,
  };

}
