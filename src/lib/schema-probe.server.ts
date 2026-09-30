/**
 * Response-schema validation — the layer above liveness and capability.
 *
 * A 200 only proves the host answers, and a JSON body only proves a machine
 * contract exists. This layer pins each provider's documented response schema
 * and verifies that a real response matches it. A body that parses fine but is
 * missing or has renamed a required field (`error.type` → `error.kind`,
 * `content` vs `text`…) is the failure agents hit hardest, because downstream
 * code keeps running until it crashes on the absent field. As with liveness,
 * one reported shape failure is confirmed on a second attempt before it is
 * published, so a flaky parser never gets blamed.
 *
 * Without provider keys, the verifiable contract for key-gated routes is the
 * documented auth envelope (401/403) on the documented route: it exercises the
 * real request path and catches envelope renames. Open endpoints are checked
 * against the full documented success schema.
 */

import { hasPlaceholder, isPublicHttpTarget } from "@/lib/capability-probe.server";

export type SchemaProbe = { probeable: boolean; ok: boolean | null; detail: string };

type SchemaProfile = {
  provider: string;
  method: "GET" | "POST";
  /** Appended to the entry's endpoint. Omitted when the endpoint is the full documented route. */
  path?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Dotted paths that must be present in a 2xx response. */
  successRequired: string[];
  /** Documented literal values verified when the path exists in a 2xx response. */
  successValues?: Record<string, unknown>;
  /** Dotted paths that must be present on the documented auth/validation error. */
  errorRequired: string[];
};

/**
 * Pinned from the providers' documented contracts and confirmed against live
 * responses. Profiles map by entry slug; new AI providers are added here as
 * the rollout extends beyond the first wave.
 */
export const SCHEMA_PROFILES: Record<string, SchemaProfile> = {
  "openai-api": {
    provider: "OpenAI",
    method: "POST",
    path: "/chat/completions",
    body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "ping" }] },
    successRequired: [],
    // Documented error envelope: { error: { message, type, param, code } }.
    errorRequired: ["error.message", "error.type"],
  },
  "anthropic-api": {
    provider: "Anthropic",
    method: "POST",
    body: {
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    },
    headers: { "anthropic-version": "2023-06-01" },
    successRequired: [],
    // Documented error envelope: { type: "error", error: { type, message } }.
    errorRequired: ["type", "error.type", "error.message"],
  },
  "groq-api": {
    provider: "Groq",
    method: "POST",
    path: "/chat/completions",
    body: { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: "ping" }] },
    successRequired: [],
    errorRequired: ["error.message", "error.type"],
  },
  "openrouter-api": {
    provider: "OpenRouter",
    method: "POST",
    path: "/chat/completions",
    body: { model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "ping" }] },
    successRequired: [],
    errorRequired: ["error.message"],
  },
  "mistral-api": {
    provider: "Mistral",
    method: "POST",
    path: "/chat/completions",
    body: { model: "mistral-small-latest", messages: [{ role: "user", content: "ping" }] },
    successRequired: [],
    // Live envelope: { "detail": "Invalid API Key" }.
    errorRequired: ["detail"],
  },
  "perplexity-api": {
    provider: "Perplexity",
    method: "POST",
    body: { model: "sonar", messages: [{ role: "user", content: "ping" }] },
    successRequired: [],
    errorRequired: ["error.message"],
  },
  "google-gemini-api": {
    provider: "Google Gemini",
    method: "GET",
    successRequired: [],
    // Documented error envelope: { error: { code, message, status } }.
    errorRequired: ["error.message", "error.status"],
  },
  "cohere-api": {
    provider: "Cohere",
    method: "GET",
    path: "/models",
    successRequired: [],
    // Live envelope: { "id": ..., "message": "no api key supplied" }.
    errorRequired: ["message"],
  },
  "hugging-face-inference-api": {
    provider: "Hugging Face Inference",
    method: "GET",
    successRequired: ["object", "data", "data.0.id", "data.0.object"],
    successValues: { object: "list" },
    errorRequired: [],
  },
};

const TIMEOUT_MS = 10_000;
const CONFIRM_DELAY_MS = 1_500;

/** Resolves a dotted path (`error.message`, `data.0.id`) against parsed JSON. */
function resolvePath(value: unknown, path: string): { exists: boolean; value: unknown } {
  let current: unknown = value;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return { exists: false, value: undefined };
    if (Array.isArray(current)) {
      const index = /^\d+$/.test(segment) ? Number(segment) : -1;
      if (index < 0 || index >= current.length) return { exists: false, value: undefined };
      current = current[index];
    } else if (!(segment in (current as Record<string, unknown>))) {
      return { exists: false, value: undefined };
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return { exists: current !== undefined, value: current };
}

function joinRoute(endpoint: string, path: string): string {
  if (!path) return endpoint;
  try {
    // A leading "/" would resolve as an absolute path and drop the endpoint's
    // own prefix (/v1…); profiles append to the documented base.
    return new URL(
      path.startsWith("/") ? path.slice(1) : path,
      endpoint.endsWith("/") ? endpoint : `${endpoint}/`,
    ).toString();
  } catch {
    return `${endpoint}${path}`;
  }
}

/** Exported for demonstration/test runs — pure, no network. */
export function verifySuccess(payload: unknown, profile: SchemaProfile): SchemaProbe {
  const missing: string[] = [];
  for (const path of profile.successRequired) {
    if (!resolvePath(payload, path).exists) missing.push(path);
  }
  const renamed: string[] = [];
  for (const [path, expected] of Object.entries(profile.successValues ?? {})) {
    const resolved = resolvePath(payload, path);
    if (resolved.exists && resolved.value !== expected) renamed.push(`${path}=${String(resolved.value)}`);
  }
  if (missing.length > 0 || renamed.length > 0) {
    const problems = [
      missing.length ? `missing field(s): ${missing.join(", ")}` : null,
      renamed.length ? `renamed value(s): ${renamed.join(", ")} (documented: ${Object.entries(profile.successValues ?? {}).map(([p, v]) => `${p}=${String(v)}`).join(", ")})` : null,
    ].filter(Boolean).join("; ");
    return { probeable: true, ok: false, detail: `Success response deviates from the documented schema — ${problems}` };
  }
  return {
    probeable: true,
    ok: true,
    detail: `Response matches the documented schema (${profile.successRequired.length} required field${profile.successRequired.length === 1 ? "" : "s"} verified)`,
  };
}

function verifyError(payload: unknown, status: number, profile: SchemaProfile): SchemaProbe {
  if (profile.errorRequired.length === 0) {
    return {
      probeable: true,
      ok: null,
      detail: `Auth-gated (HTTP ${status}) — documented success schema not verifiable without a key`,
    };
  }
  const missing = profile.errorRequired.filter((path) => !resolvePath(payload, path).exists);
  if (missing.length > 0) {
    return {
      probeable: true,
      ok: false,
      detail: `HTTP ${status} response deviates from the documented error envelope — missing field(s): ${missing.join(", ")}`,
    };
  }
  return {
    probeable: true,
    ok: true,
    detail: `HTTP ${status} auth challenge matches the documented error envelope (${profile.errorRequired.length} fields verified)`,
  };
}

async function probeSchemaOnce(entry: { slug: string; endpoint: string }): Promise<SchemaProbe> {
  const profile = SCHEMA_PROFILES[entry.slug];
  if (!profile) return { probeable: false, ok: null, detail: "No pinned schema for this entry" };
  const base = entry.endpoint.trim();
  if (!/^https?:\/\//i.test(base) || hasPlaceholder(base)) {
    return { probeable: false, ok: null, detail: "No concrete HTTP route to pin a schema against" };
  }
  const route = joinRoute(base, profile.path ?? "");
  if (!isPublicHttpTarget(route)) {
    return { probeable: false, ok: null, detail: "Route is not a public address — not probed" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(route, {
      method: profile.method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "AgentNexus-SchemaProbe/1.0",
        ...(profile.method === "POST" ? { "content-type": "application/json" } : {}),
        ...(profile.headers ?? {}),
      },
      body: profile.method === "POST" ? JSON.stringify(profile.body ?? {}) : null,
    });

    if (response.status >= 300 && response.status < 400) {
      return { probeable: true, ok: null, detail: `Redirected (HTTP ${response.status}) — shape not verified this run` };
    }
    if (response.status === 429) {
      return { probeable: true, ok: null, detail: "Rate-limited — shape not verified this run" };
    }
    if (response.status === 404 || response.status === 405) {
      return { probeable: true, ok: null, detail: `HTTP ${response.status} on the documented route — shape not verifiable this run` };
    }

    const text = (await response.text()).slice(0, 200_000);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      // A challenge/bot-protection page from a gateway is not evidence about the
      // documented schema; reporting it as a shape failure would publish a lie.
      const kind = (response.headers.get("content-type") ?? "").split(";")[0] || "unlabelled body";
      return {
        probeable: true,
        ok: null,
        detail: `HTTP ${response.status} returned a non-JSON body (${kind}) — gateway or bot protection, shape not verified this run`,
      };
    }

    if (response.ok) return verifySuccess(payload, profile);
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return verifyError(payload, response.status, profile);
    }
    return { probeable: true, ok: null, detail: `HTTP ${response.status} — shape not verified this run` };
  } catch {
    // A network failure is a liveness concern, not evidence about the schema.
    return { probeable: true, ok: null, detail: "Network error — shape not verified this run" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One reported shape failure must mean a real deviation: a single timeout or
 * hiccup is retried after a short backoff, and only a failure confirmed on
 * both attempts is published.
 */
export async function runSchemaProbe(entry: { slug: string; endpoint: string }): Promise<SchemaProbe> {
  const first = await probeSchemaOnce(entry);
  if (!first.probeable || first.ok !== false) return first;
  await new Promise((resolve) => setTimeout(resolve, CONFIRM_DELAY_MS));
  const second = await probeSchemaOnce(entry);
  if (second.ok === false) return { ...second, detail: `${second.detail} (confirmed on 2 attempts)` };
  return second;
}
