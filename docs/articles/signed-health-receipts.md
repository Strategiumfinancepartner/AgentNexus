---
title: Signed Health Receipts: Stale Truth Is Not Failed Verification
published: false
canonical_url: https://agentnexus.app/guides/health-receipts
tags: ai, mcp, security, api
---

# Signed health receipts

Caller-bound health evidence with typed replay outcomes, observation dates and explicit verification limits.

## Evidence, not execution authority

Agent Nexus signs observed health evidence for a verified API-key principal, endpoint, schema hash, health:read scope and caller nonce. Public GET health cards remain anonymous. A receipt neither authorizes a provider call nor proves task completion.

## Four outcomes, four meanings

cache_hit means stored scheduled observations. fresh_probe requires every required observation during the probe request; health-card POST does not run a fresh provider probe. nonce_reuse rejects a previously reserved or consumed nonce. verifier_error means verification could not complete, not that the provider is down.

## Dates and decisions stay attached

Each result includes probe_time, expiry, key_id and route_decision. The key ID identifies the signing key, not the caller's secret. Signed results bind these fields to the receipt. Unverifiable failures expose null probe time and expiry rather than invented evidence. inspect_evidence, reject_replay and retry_verification are advisory decisions, never automatic provider routing.

## Replay protection across simultaneous requests

Issuance atomically reserves nonce hashes per verified key principal for 24 hours across all health-card routes. Reuse returns HTTP 409 with a signed nonce_reuse result. Infrastructure or signing failure returns HTTP 503 with verifier_error and no unsigned fallback. If a reserved request fails, use a new nonce.

## Verify and consume at the caller

Pin the issuer and trusted JWKS, verify ES256, then match caller, endpoint, schema, scope and nonce. Check the 120-second maximum lifetime, actual observation age, completeness and verdict against your policy. The typed verifier uses your durable atomic nonce-consumption callback; issuance replay protection does not replace offline replay protection.

## Fresh issuance cannot refresh old truth

Signing does not change observation dates. A cache_hit can describe healthy, degraded, down, unknown or stale evidence. Missing or partial required observations cannot yield a healthy verdict. Evidence has a 24-hour issuer ceiling; clients should apply a stricter age limit where appropriate. No downstream tool is executed by receipt issuance.

Contract: https://github.com/Strategiumfinancepartner/AgentNexus/blob/main/docs/health-receipts.md

Agent Nexus / agentnexus.app
