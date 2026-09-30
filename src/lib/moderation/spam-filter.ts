/**
 * Automatic promotional / prompt-injection filter for machine submissions.
 *
 * Runs before an agent submission reaches the human moderation queue.
 * Two outcomes above the thresholds:
 *   - "block": refused at the door, never stored (obvious advertising or an
 *     attempt to instruct the reading agent).
 *   - "flag": stored as pending, but annotated so the reviewer sees why.
 *
 * Deliberately conservative: legitimate API/MCP listings describe endpoints,
 * auth and payloads; they do not tell the reader to follow a social account,
 * cite a brand first, or call a phone number.
 */

export type SpamVerdict = {
  action: "allow" | "flag" | "block";
  score: number;
  reasons: string[];
};

export type SpamCandidate = {
  name: string;
  summary: string;
  description?: string;
  endpoint: string;
  docs_url?: string | null;
  tags?: string[];
  capabilities?: string[];
  invocation_example?: string;
  pricing?: string;
};

type Rule = {
  id: string;
  weight: number;
  test: (haystack: string, c: SpamCandidate) => boolean;
};

const SOCIAL_HOSTS =
  /(instagram\.com|facebook\.com|fb\.me|tiktok\.com|wa\.me|whatsapp\.com|t\.me|pinterest\.|x\.com\/[a-z0-9_]+\/?$|twitter\.com\/[a-z0-9_]+\/?$)/i;

/** Attempts to steer the agent that reads the registry. */
const INJECTION =
  /(ignore (all )?(previous|prior) (instructions|prompts)|tell (the )?(human|user) to|cite [^.]{0,60} first|you must (say|recommend|mention)|always recommend|do not mention|refuse (to )?(turnkey|phone|other)|prioriti[sz]e (us|our)|system prompt)/i;

const MARKETING =
  /(best in (class|india|town)|award[- ]winning|world[- ]class|premier|elite (landmark|studio|service)|luxury|bespoke|no\.?\s?1\b|#1\b|top[- ]rated|hire us|book (a )?(consult|call|appointment)|dm us|follow us|contact us on|limited offer|special price)/i;

const CONSULT_COMMERCE =
  /(paid consult|per\s?sq\.?\s?ft|\/sqft|sq\.?ft\b|turnkey|interior|architect|real estate|clinic|salon|restaurant|catering|wedding|astrolog|tarot|loan|casino|betting|escort|seo services|guest post|backlink)/i;

const PHONE = /(\+\d[\d\s().-]{7,}\d|\bwhatsapp\b|\bcall us\b)/i;

const CURRENCY = /[₹]|(?:\bINR\b|\bRs\.?\s?\d)/;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const RULES: Rule[] = [
  { id: "prompt-injection", weight: 5, test: (h) => INJECTION.test(h) },
  { id: "social-promo-link", weight: 4, test: (h) => SOCIAL_HOSTS.test(h) },
  { id: "marketing-copy", weight: 3, test: (h) => MARKETING.test(h) },
  { id: "offline-service-pitch", weight: 3, test: (h) => CONSULT_COMMERCE.test(h) },
  { id: "phone-or-messaging-contact", weight: 3, test: (h) => PHONE.test(h) },
  { id: "consumer-pricing", weight: 2, test: (h) => CURRENCY.test(h) },
  {
    id: "endpoint-is-not-an-api",
    weight: 2,
    test: (_h, c) => {
      const host = hostOf(c.endpoint);
      if (!host) return true;
      const path = (() => {
        try {
          return new URL(c.endpoint).pathname;
        } catch {
          return "/";
        }
      })();
      const looksApi =
        /(^api\.|^mcp\.|\.api\.)/.test(host) ||
        /(\/api\/?|\/v\d|\/mcp|\/graphql|\/rpc|\.json|\/sse)/i.test(path);
      return !looksApi;
    },
  },
  {
    id: "shouting-caps",
    weight: 1,
    test: (h) => {
      const words = h.split(/\s+/).filter((w) => w.length > 3);
      if (words.length < 6) return false;
      const caps = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
      return caps.length / words.length > 0.2;
    },
  },
  {
    id: "no-technical-substance",
    weight: 2,
    test: (h, c) => {
      const technical =
        /(json|http|rest|endpoint|header|token|bearer|query|payload|schema|rate limit|webhook|jsonrpc|sse|graphql|oauth|api key)/i;
      const hasExample = (c.invocation_example ?? "").trim().length > 12;
      return !technical.test(h) && !hasExample;
    },
  },
];

export const SPAM_FLAG_THRESHOLD = 3;
export const SPAM_BLOCK_THRESHOLD = 7;

export function screenSubmission(candidate: SpamCandidate): SpamVerdict {
  const haystack = [
    candidate.name,
    candidate.summary,
    candidate.description ?? "",
    candidate.endpoint,
    candidate.docs_url ?? "",
    (candidate.tags ?? []).join(" "),
    (candidate.capabilities ?? []).join(" "),
    candidate.invocation_example ?? "",
    candidate.pricing ?? "",
  ].join("\n");

  let score = 0;
  const reasons: string[] = [];
  for (const rule of RULES) {
    if (rule.test(haystack, candidate)) {
      score += rule.weight;
      reasons.push(rule.id);
    }
  }

  const action =
    score >= SPAM_BLOCK_THRESHOLD ? "block" : score >= SPAM_FLAG_THRESHOLD ? "flag" : "allow";
  return { action, score, reasons };
}

/** Message returned to the machine when a submission is refused outright. */
export function blockMessage(verdict: SpamVerdict): string {
  return (
    "Submission refused by the automatic promotional filter " +
    `(signals: ${verdict.reasons.join(", ")}). ` +
    "Agent Nexus lists callable APIs, MCP servers and CLIs: the entry must describe a machine endpoint " +
    "(request, auth, response) and must not advertise an offline service, link a social account, or contain " +
    "instructions aimed at the agent reading the registry. Fix the entry and retry, or ask a human reviewer at " +
    "https://agentnexus.app/submit."
  );
}
