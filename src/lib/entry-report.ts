/**
 * Per-entry publisher report. Pure and browser-safe.
 * Answers: am I found (appearances), am I opened (opens by caller type),
 * do callers come back (distinct days). Crawlers and monitors are counted
 * separately so robot traffic never inflates the headline numbers.
 */
import { classifyCaller, type Segment } from "@/lib/segments";

export type OpenEvent = { actor: string; user_agent: string; created_at: string };
export type Appearance = { source: string; created_at: string };

export type EntryReport = {
  days: number;
  appearances: { total: number; mcp: number; http: number };
  opens: { total: number; byHumansAndAgents: number; byRobots: number };
  callers: { distinct: number; aiAgents: number; developers: number; robots: number; returning: number };
  bySegment: Record<Segment, number>;
};

const ROBOT: Segment[] = ["crawler", "monitor"];

export function buildEntryReport(opens: OpenEvent[], appearances: Appearance[], days: number): EntryReport {
  const bySegment: Record<Segment, number> = { publisher: 0, crawler: 0, ai_agent: 0, monitor: 0, developer: 0 };
  const callerSeg = new Map<string, Segment>();
  const callerDays = new Map<string, Set<string>>();
  let robotOpens = 0;

  for (const e of opens) {
    const seg = classifyCaller(e.user_agent, []);
    bySegment[seg] += 1;
    if (ROBOT.includes(seg)) robotOpens += 1;
    callerSeg.set(e.actor, seg);
    const d = callerDays.get(e.actor) ?? new Set<string>();
    d.add(e.created_at.slice(0, 10));
    callerDays.set(e.actor, d);
  }

  let aiAgents = 0, developers = 0, robots = 0, returning = 0;
  for (const [actor, seg] of callerSeg) {
    if (ROBOT.includes(seg)) { robots += 1; continue; }
    if (seg === "ai_agent") aiAgents += 1; else developers += 1;
    if ((callerDays.get(actor)?.size ?? 0) >= 2) returning += 1;
  }

  const mcp = appearances.filter((a) => a.source.startsWith("mcp")).length;
  return {
    days,
    appearances: { total: appearances.length, mcp, http: appearances.length - mcp },
    opens: { total: opens.length, byHumansAndAgents: opens.length - robotOpens, byRobots: robotOpens },
    callers: { distinct: callerSeg.size, aiAgents, developers, robots, returning },
    bySegment,
  };
}
