/**
 * Monthly publisher report content. Pure and browser-safe.
 * Headline numbers NEVER include crawlers or monitors: robot traffic is shown
 * on its own line, labelled as such, so it can never pass for agent interest.
 */
import type { EntryReport } from "@/lib/entry-report";

export type MonthlyInput = {
  entryName: string;
  slug: string;
  month: string; // YYYY-MM covered
  report: EntryReport;
  successReports: number; // invocation reports from callers that used the service
  checks: number;
  checksOk: number;
  incidents: { at: string; detail: string }[];
  paying: boolean;
};

export type MonthlyReport = {
  paying: boolean;
  entryName: string;
  month: string;
  lines: { label: string; value: string }[];
  incidents: { at: string; detail: string }[];
  recommendations: string[];
  robotNote: string;
  entryUrl: string;
};

export function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

/** Previous calendar month (UTC) of `now`. */
export function previousMonth(now: Date) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return monthKey(t);
}

export function monthlyIdempotencyKey(entryId: string, month: string) {
  return `monthly:${entryId}:${month}`;
}

export function buildMonthlyReport(i: MonthlyInput): MonthlyReport {
  const r = i.report;
  const uptime = i.checks > 0 ? `${((i.checksOk / i.checks) * 100).toFixed(1)}% (${i.checks} probes)` : "not probed";
  const genuineOpens = r.opens.byHumansAndAgents;
  const all: { label: string; value: string }[] = [
    { label: "Search appearances (agents were shown your listing)", value: String(r.appearances.total) },
    { label: "Listing opens by AI agents and developers", value: String(genuineOpens) },
    { label: "Distinct AI agent clients", value: String(r.callers.aiAgents) },
    { label: "Returning callers (2+ days)", value: String(r.callers.returning) },
    { label: "Reported calls to your service", value: String(i.successReports) },
    { label: "Availability", value: uptime },
  ];
  const lines = i.paying ? all : [all[0]!, all[1]!, all[5]!];

  const recommendations: string[] = [];
  if (r.appearances.total > 0 && genuineOpens === 0)
    recommendations.push("Agents saw your listing but none opened it: make the summary state the task it solves and the auth required.");
  if (r.appearances.total === 0)
    recommendations.push("No search appearances: declare concrete capabilities (verbs like send_email, geocode) so needs map to your listing.");
  if (i.checks > 0 && i.checksOk / i.checks < 0.99)
    recommendations.push("Availability below 99%: agents see current health and rank unstable services lower.");
  if (!i.paying)
    recommendations.push("Publisher ($49/month) adds the full breakdown, outage/staleness/schema alerts by email or signed webhook, and per-source data checks.");

  return {
    paying: i.paying,
    entryName: i.entryName,
    month: i.month,
    lines,
    incidents: i.paying ? i.incidents.slice(0, 10) : [],
    recommendations,
    robotNote: `${r.opens.byRobots} additional opens came from crawlers and monitors and are excluded above.`,
    entryUrl: `https://agentnexus.app/registry/${i.slug}`,
  };
}
