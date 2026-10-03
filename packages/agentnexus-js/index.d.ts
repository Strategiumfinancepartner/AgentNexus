export declare const VERSION: string;
export declare const MCP_URL: string;

export declare class AgentNexusError extends Error {
  status?: number;
  constructor(message: string, status?: number);
}

export interface Match {
  slug: string;
  name: string;
  category: string;
  summary: string;
  match_score: number;
  matched_on: "capability" | "fallback";
  capabilities: string[];
  call: {
    endpoint: string | null;
    auth_mode: string;
    auth_params: unknown;
    input_format: string | null;
    output_format: string | null;
    rate_limit: string | null;
    pricing: string | null;
    example?: unknown;
    docs_url?: string | null;
  };
  trust: {
    verified: boolean;
    reliability_score: number | null;
    uptime: number | null;
    samples: number;
    agent_reports: number;
    avg_latency_ms: number | null;
    last_probe_ok: boolean | null;
    last_probe_at: string | null;
  };
  [k: string]: unknown;
}

export interface DiscoverResponse {
  need: string;
  coverage: "exact" | "partial" | "none";
  count: number;
  matches: Match[];
  [k: string]: unknown;
}

export interface ClientOptions {
  apiKey?: string | null;
  baseUrl?: string;
  timeoutMs?: number;
}

export declare class AgentNexus {
  apiKey?: string | null;
  baseUrl: string;
  timeoutMs: number;
  constructor(opts?: ClientOptions);
  discover(need: string, opts?: { limit?: number; category?: string; minReliability?: number }): Promise<DiscoverResponse>;
  find(need: string, opts?: { limit?: number; category?: string; minReliability?: number }): Promise<Match | null>;
  search(query?: string, opts?: { category?: string; limit?: number }): Promise<Record<string, unknown>>;
  getEntry(slug: string): Promise<Record<string, unknown>>;
  healthCard(slug: string): Promise<Record<string, unknown>>;
  report(slug: string, opts: { ok: boolean; statusCode?: number; latencyMs?: number; note?: string }): Promise<Record<string, unknown>>;
  static createKey(opts?: { agent?: string; purpose?: string; baseUrl?: string }): Promise<string>;
}

export default AgentNexus;
