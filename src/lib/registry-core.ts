import { z } from "zod";

export const CATEGORIES = ["api", "mcp", "cli"] as const;
export type Category = (typeof CATEGORIES)[number];

export type AuthParam = { name: string; location: string; required: boolean };

export type Entry = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  summary: string;
  description: string;
  auth_mode: string;
  endpoint: string;
  docs_url: string | null;
  tags: string[];
  capabilities: string[];
  auth_params: AuthParam[];
  input_format: string;
  output_format: string;
  rate_limit: string;
  pricing: string;
  invocation_example: string;
  verified: boolean;
  verified_at: string | null;
  featured: boolean;
  checks_total: number;
  checks_ok: number;
  avg_latency_ms: number | null;
  status: "pending" | "approved" | "rejected";
  submitted_by: string | null;
  review_note: string | null;
  health_ok: boolean | null;
  health_status_code: number | null;
  health_latency_ms: number | null;
  health_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ENTRY_COLUMNS =
  "id, slug, name, category, summary, description, auth_mode, endpoint, docs_url, tags, capabilities, auth_params, input_format, output_format, rate_limit, pricing, invocation_example, verified, verified_at, featured, checks_total, checks_ok, avg_latency_ms, status, submitted_by, review_note, health_ok, health_status_code, health_latency_ms, health_checked_at, created_at, updated_at";

export const listInput = z.object({
  search: z.string().trim().max(120).optional().default(""),
  category: z.enum(["all", ...CATEGORIES]).optional().default("all"),
});

const authParamSchema = z.object({
  name: z.string().trim().min(1).max(60),
  location: z.string().trim().min(1).max(40),
  required: z.boolean().optional().default(true),
});

export const submitInput = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(4000).optional().default(""),
  auth_mode: z.string().trim().min(1).max(120),
  endpoint: z.string().trim().min(1).max(500),
  docs_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().default([]),
  capabilities: z
    .array(z.string().trim().min(2).max(40))
    .max(12)
    .optional()
    .default([]),
  auth_params: z.array(authParamSchema).max(10).optional().default([]),
  input_format: z.string().trim().max(120).optional().default(""),
  output_format: z.string().trim().max(120).optional().default(""),
  rate_limit: z.string().trim().max(120).optional().default(""),
  pricing: z.string().trim().max(120).optional().default(""),
  invocation_example: z.string().trim().max(1000).optional().default(""),
});

export type SubmitInput = z.infer<typeof submitInput>;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ------------------------------------------------------------------ */
/* Reliability                                                         */
/* ------------------------------------------------------------------ */

export type ReliabilitySource = Pick<
  Entry,
  "checks_total" | "checks_ok" | "avg_latency_ms" | "health_ok" | "verified"
>;

export type Reliability = {
  score: number | null;
  uptime: number | null;
  samples: number;
  avgLatencyMs: number | null;
  grade: "unproven" | "poor" | "fair" | "good" | "excellent";
};

/**
 * 0-100 confidence an agent can place in this interface:
 * 70 pts uptime ratio, 20 pts latency, 10 pts human verification.
 */
export function reliability(entry: ReliabilitySource): Reliability {
  const samples = entry.checks_total ?? 0;
  if (samples === 0) {
    return {
      score: null,
      uptime: null,
      samples: 0,
      avgLatencyMs: entry.avg_latency_ms ?? null,
      grade: "unproven",
    };
  }
  const uptime = Math.min(1, (entry.checks_ok ?? 0) / samples);
  const latency = entry.avg_latency_ms;
  const latencyPoints =
    latency == null ? 12 : latency <= 300 ? 20 : latency <= 800 ? 15 : latency <= 2000 ? 8 : 3;
  const score = Math.round(uptime * 70 + latencyPoints + (entry.verified ? 10 : 0));
  const grade =
    score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor";
  return { score, uptime, samples, avgLatencyMs: latency ?? null, grade };
}

/* ------------------------------------------------------------------ */
/* Capability discovery                                                */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "the","a","an","to","for","of","and","or","with","i","need","want","how","do","can","my",
  "je","dois","veux","un","une","des","de","du","la","le","les","pour","avec","comment",
]);

export function needTokens(need: string): string[] {
  return need
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export type MatchSource = Pick<
  Entry,
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "tags"
  | "capabilities"
  | "category"
  | "checks_total"
  | "checks_ok"
  | "avg_latency_ms"
  | "health_ok"
  | "verified"
  | "featured"
>;

/** Scores how well an interface answers a natural-language need. */
export function matchScore(entry: MatchSource, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const capabilities = (entry.capabilities ?? []).map((c) => c.toLowerCase());
  const tags = (entry.tags ?? []).map((t) => t.toLowerCase());
  const text = `${entry.name} ${entry.slug} ${entry.summary} ${entry.description ?? ""}`.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (capabilities.some((c) => c.includes(token) || token.includes(c))) score += 6;
    else if (tags.some((t) => t.includes(token) || token.includes(t))) score += 4;
    else if (text.includes(token)) score += 2;
  }
  if (score === 0) return 0;

  const rel = reliability(entry);
  if (rel.score != null) score += rel.score / 40; // up to +2.5 for proven interfaces
  if (entry.verified) score += 1;
  // Publisher placement: a tiebreak among interfaces that already match the
  // need, never a way to outrank a more relevant or more reliable interface.
  if (entry.featured) score += 0.5;
  if (entry.health_ok === false) score -= 2;
  return Math.round(score * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Authorisation helpers                                               */
/* ------------------------------------------------------------------ */

export async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}

/** Admins and moderators may review submissions. */
export async function assertReviewer(context: { supabase: any; userId: string }) {
  const [admin, moderator] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
  ]);
  if (admin.error) throw new Error(admin.error.message);
  if (moderator.error) throw new Error(moderator.error.message);
  if (!admin.data && !moderator.data) throw new Error("Forbidden");
}

/* ------------------------------------------------------------------ */
/* Discovery response builder (shared by /api/public/discover + MCP)   */
/* ------------------------------------------------------------------ */

export type DiscoveryCoverage = "exact" | "partial" | "none";

export type DiscoveryMatch = {
  slug: string;
  name: string;
  category: string;
  summary: string;
  match_score: number;
  matched_on: "capability" | "fallback";
  capabilities: string[];
  call: Record<string, unknown>;
  trust: Record<string, unknown>;
};

export type DiscoveryResult = {
  need: string;
  coverage: DiscoveryCoverage;
  count: number;
  matches: DiscoveryMatch[];
  uncovered: boolean;
  note: string;
  next_steps: string[];
};

function shape(entry: any, score: number, matched_on: DiscoveryMatch["matched_on"]): DiscoveryMatch {
  const rel = reliability(entry);
  return {
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    summary: entry.summary,
    match_score: score,
    matched_on,
    capabilities: entry.capabilities ?? [],
    call: {
      endpoint: entry.endpoint,
      auth_mode: entry.auth_mode,
      auth_params: entry.auth_params ?? [],
      input_format: entry.input_format || null,
      output_format: entry.output_format || null,
      rate_limit: entry.rate_limit || null,
      pricing: entry.pricing || null,
      example: entry.invocation_example || null,
      docs_url: entry.docs_url,
    },
    trust: {
      verified: Boolean(entry.verified),
      reliability_score: rel.score,
      uptime: rel.uptime,
      samples: rel.samples,
      avg_latency_ms: rel.avgLatencyMs,
      last_probe_ok: entry.health_ok,
      last_probe_at: entry.health_checked_at,
    },
  };
}

/**
 * Builds a discovery answer that is NEVER empty: when nothing matches the need
 * we degrade to the most reliable interfaces of the requested layer and mark
 * the need as uncovered, so the calling agent still gets something actionable
 * and the registry learns where its coverage gaps are.
 */
export function buildDiscovery(
  rows: any[],
  options: {
    need: string;
    tokens: string[];
    category?: string | null;
    minReliability?: number;
    limit?: number;
  },
): DiscoveryResult {
  const { need, tokens } = options;
  const minReliability = options.minReliability ?? 0;
  const limit = options.limit ?? 5;

  const scored = rows
    .map((entry) => ({ entry, score: matchScore(entry, tokens), rel: reliability(entry) }))
    .filter(({ score, rel }) => score > 0 && (rel.score ?? 0) >= minReliability)
    .sort((a, b) => b.score - a.score || (b.rel.score ?? 0) - (a.rel.score ?? 0));

  if (scored.length > 0) {
    const matches = scored.slice(0, limit).map(({ entry, score }) => shape(entry, score, "capability"));
    const strong = (scored[0]?.score ?? 0) >= 6;
    return {
      need,
      coverage: strong ? "exact" : "partial",
      count: matches.length,
      matches,
      uncovered: false,
      note: strong
        ? "Matched on declared capabilities. Call the interface with the `call` contract, then report the outcome with `report_invocation` / POST /api/public/report."
        : "Weak match: these interfaces mention part of the need but do not declare it as a capability. Verify before calling, and report the outcome so the registry improves.",
      next_steps: ["report_invocation after calling", "submit_entry if you know a better interface"],
    };
  }

  const fallback = rows
    .map((entry) => ({ entry, rel: reliability(entry) }))
    .sort(
      (a, b) =>
        (b.rel.score ?? -1) - (a.rel.score ?? -1) ||
        Number(Boolean(b.entry.verified)) - Number(Boolean(a.entry.verified)),
    )
    .slice(0, Math.min(limit, 3))
    .map(({ entry }) => shape(entry, 0, "fallback"));

  return {
    need,
    coverage: "none",
    count: 0,
    matches: fallback,
    uncovered: true,
    note: "No interface in the registry declares this capability yet. The need has been recorded as a coverage gap. The entries below are the most reliable interfaces in this layer, returned as a starting point only — they are NOT a match.",
    next_steps: [
      "submit_entry (MCP) or POST /api/public/report to tell Nexus which interface solves this",
      "retry with a broader need, e.g. drop product names and describe the action",
    ],
  };
}
