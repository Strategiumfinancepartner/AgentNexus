# Case study: high-freshness job discovery for AI agents with Remote Jobs API (Nova)

*Pilot: October 21 – November 4, 2026 · Reviewed and approved for publication by Nova*

| Metric | Day 0 (Oct 21) | Day 14 (Nov 4) |
| --- | --- | --- |
| Live listings | ~1.01M | ~1.46M |
| Sources | 32 | 82 |
| Sources reporting `source_last_updated` | — | 82/82 |
| Probe reliability | — | 100% |

## Challenge

Aggregating over 1.4 million remote jobs across dozens of distributed platforms requires real-time proof that data is not only accessible, but continuously fresh. AI agents performing automated job matching drop providers that return stale records or silent empty responses.

## Solution

Agent Nexus partnered with Remote Jobs API for a 14-day continuous health probe pilot. Running hourly multi-layer checks (HTTP liveness, schema validation and catalog volume verification), Agent Nexus monitored the endpoint as the catalog scaled from 1.01M to over 1.45M listings and from 32 to 82 active sources.

## Outcome

During the pilot, Remote Jobs API introduced granular `source_last_updated` timestamps across all 82 sources, enabling autonomous agents to verify source-level freshness in well under a second without consuming discovery tokens. The endpoint maintained 100% probe reliability throughout the period, establishing Remote Jobs API as a high-trust reference for AI agents across the ecosystem.

## Verify it yourself

- Live health card: https://agentnexus.app/api/public/health-card/remote-jobs-api-api-nfpe
- Remote Jobs API health: https://remote-jobs-api.tten.no/health
- Web version: https://agentnexus.app/case-studies/nova
