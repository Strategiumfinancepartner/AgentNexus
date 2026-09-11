/** Shared (isomorphic) shapes and math for the public reliability history. */

export type UptimeDay = {
  day: string;
  checks: number;
  ok: number;
  avg_latency: number | null;
};

export type StatusEntry = {
  slug: string;
  name: string;
  category: "api" | "mcp" | "cli";
  health_ok: boolean | null;
  health_checked_at: string | null;
  checks_total: number;
  checks_ok: number;
  avg_latency_ms: number | null;
  /** Oldest → newest, one bucket per UTC day over the window. */
  days: UptimeDay[];
  window_uptime: number | null;
};

export type Incident = {
  slug: string;
  name: string;
  checked_at: string;
  status_code: number | null;
  error: string | null;
};

export type StatusPayload = {
  generated_at: string;
  window_days: number;
  totals: {
    entries: number;
    monitored: number;
    up: number;
    down: number;
    unknown: number;
    checks: number;
    checks_ok: number;
    uptime: number | null;
    avg_latency_ms: number | null;
  };
  entries: StatusEntry[];
  incidents: Incident[];
};

export function utcDayKeys(days: number, now = new Date()): string[] {
  const keys: string[] = [];
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(base - i * 86_400_000).toISOString().slice(0, 10));
  }
  return keys;
}

export function uptimeRatio(ok: number, total: number): number | null {
  return total > 0 ? ok / total : null;
}

export function formatPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(ratio >= 0.999 ? 2 : 1)}%`;
}
