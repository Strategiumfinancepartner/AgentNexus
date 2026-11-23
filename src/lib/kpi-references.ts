/**
 * Historical KPI snapshots. Immutable by design: never recomputed from new
 * events or tracking rules. Each keeps its own window, denominator and exclusions.
 */
export const KPI_REFERENCES = Object.freeze({
  A: Object.freeze({
    label: "Reference A: initial 14-day funnel",
    scope: "External callers; bots and monitoring tools excluded.",
    callers: 3073, connections: 1156, toolsList: 749, searches: 246, returnedOtherDay: 45,
    connectToSearchPct: 21.3, toolsListToSearchPct: 32.8, searchersReturnPct: 18.3,
  }),
  B: Object.freeze({
    label: "Reference B: before MCP instruction rewrite",
    cutoff: "2026-11-16T23:59:00Z",
    connectToSearchPct: 21.3, searchersReturnPct: 18.3,
  }),
  C: Object.freeze({
    label: "Reference C: detailed 30-day funnel",
    scope: "External callers; crawlers, directories, monitors and internal tests excluded.",
    callers: 7527, connected: 6795, toolsList: 1185, searches: 280, usefulResults: 103,
    entryOpens: 3658, confirmedDiscoveries: 34, repeat2Days: 85, d7Retained: 44, d7Eligible: 2441,
    anonymous: 7504, identified: 23, identifiedSearched: 7, identifiedRepeat: 2, paying: 0,
  }),
});
