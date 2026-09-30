/**
 * Abuse guard for the public discovery surfaces.
 *
 * Most callers are honest machines; a few scanners fire injection-style
 * payloads (XSS, SQLi, template injection) into the `need` field to see what
 * breaks. Nothing breaks — the registry only does in-memory text matching —
 * but we don't want to serve, count, or log those calls as if they were real
 * demand.
 *
 * Design, deliberately gentle so honest machines are never penalized:
 *   - Detection is pattern-based and conservative: every pattern below is
 *     near-impossible in a plain-language need, so a real agent never trips it.
 *   - One suspicious call is NOT a block: the caller gets a benign empty
 *     answer and a strike is recorded. Only at 3 strikes in 24h is the
 *     address refused (403) on the discovery surfaces.
 *   - Strikes are per-address and expire; monitors, crawlers and keyed
 *     callers that never send injections are completely unaffected.
 *   - Fails open: if the backend is unreachable, the request is served.
 */

import { createHash } from "crypto";

const STRIKE_BUCKET = "abuse-strike";
const STRIKE_THRESHOLD = 3;
const STRIKE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Each pattern is something no plain-language need would ever contain. */
const INJECTION_PATTERNS: RegExp[] = [
  /<script[\s>]/i, // XSS: script tag
  /javascript\s*:/i, // XSS: javascript: URL
  /on(?:click|error|load|focus|mouseover)\s*=/i, // XSS: event handler attribute
  /["']>\s*<(?:script|img|svg|iframe)/i, // XSS: tag breakout
  /union\s+(?:all\s+)?select/i, // SQLi
  /;\s*(?:drop|delete|truncate)\s+(?:table|from)/i, // SQLi
  /'\s+or\s+['"\d]/i, // SQLi: ' OR 1=1
  /\{\{[^{}]{1,80}\}\}/, // template injection: {{7*7}}
  /\$\{[^{}]{1,80}\}/, // template injection: ${7*7}
  /<%=?[\s\S]{1,80}?%>/, // template injection: ERB/EJS
  /\.\.\//, // path traversal
  /\/etc\/passwd/i, // file read probe
  /\b(?:sleep|benchmark)\s*\(\s*\d/i, // time-based SQLi
];

/** Scanners hide the same payload behind URL / HTML / hex / octal / full-width
 * encodings. Peel those layers so every variant is judged in clear text. */
function decodeLayers(text: string): string {
  let out = text;
  for (let i = 0; i < 4; i++) {
    let next = out;
    try {
      next = decodeURIComponent(next.replace(/\+/g, " "));
    } catch {
      // malformed escape: keep as-is
    }
    next = next
      .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(Number(d)))
      .replace(/&(quot|apos|lt|gt|amp);/gi, (_, n) =>
        ({ quot: '"', apos: "'", lt: "<", gt: ">", amp: "&" })[n.toLowerCase() as "quot"],
      )
      .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Quote-then-tag breakout ("'><asdf ...") — never occurs in a plain need. */
const BREAKOUT = /["']\s*>\s*<\s*[a-z]/i;

/** True when the text carries an injection-style payload. Conservative: a
 * single strong pattern is enough, and none of them appears in real needs. */
export function looksLikeInjection(text: string): boolean {
  if (!text) return false;
  const clear = decodeLayers(text);
  return [text, clear].some(
    (t) => BREAKOUT.test(t) || INJECTION_PATTERNS.some((pattern) => pattern.test(t)),
  );
}

/** Same per-IP identity the quota system uses, so strikes and quota agree. */
export function actorFor(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ?? request.headers.get("cf-connecting-ip") ?? "unknown";
  return `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

type AdminClient = {
  from: (table: string) => any;
};

async function admin(): Promise<AdminClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AdminClient;
}

/** Records one strike against the caller's address. Best-effort. */
export async function recordAbuseStrike(request: Request): Promise<void> {
  try {
    const client = await admin();
    await client
      .from("rate_limit_events")
      .insert({ bucket: STRIKE_BUCKET, actor: actorFor(request) });
  } catch {
    // telemetry must never alter the response
  }
}

/** True when this address has collected 3+ injection strikes in the last 24h. */
export async function isAbuseBlocked(request: Request): Promise<boolean> {
  try {
    const client = await admin();
    const since = new Date(Date.now() - STRIKE_WINDOW_MS).toISOString();
    const { count, error } = await client
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("bucket", STRIKE_BUCKET)
      .eq("actor", actorFor(request))
      .gte("created_at", since);
    return !error && (count ?? 0) >= STRIKE_THRESHOLD;
  } catch {
    return false; // fail open
  }
}

/** Standard 403 for a blocked address: explains why and when it lifts. */
export function abuseBlockedResponse(cors: Record<string, string>): Response {
  return new Response(
    JSON.stringify(
      {
        error: "Blocked",
        reason:
          "This address repeatedly sent injection-style payloads to the discovery API. Legitimate agents are never affected by this block.",
        lifts: "24 hours after the last attempt",
        contact: "https://agentnexus.app/connect",
      },
      null,
      2,
    ),
    { status: 403, headers: { ...cors, "Cache-Control": "no-store" } },
  );
}
