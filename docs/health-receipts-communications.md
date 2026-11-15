# Health receipt communications

## Reply to the technical comment

Agreed. We keep fresh_probe, cache_hit, nonce_reuse and verifier_error distinct, with probe time, expiry, signing key ID and an advisory route decision. Stored observations stay cache_hit, never a fresh probe just because they were signed again. Replay is checked atomically per caller; unverifiable errors carry no trusted probe timestamp. Evidence only, never execution authority.

## X post

A fresh signature is not a fresh health check.

Agent Nexus keeps cached evidence, fresh probes, nonce reuse and verification errors distinct, with observation time, expiry and signing key ID. Decisions stay advisory.

https://agentnexus.app/guides/health-receipts

## LinkedIn post

An AI agent should not have to interpret every failed health receipt as the same problem.

Agent Nexus distinguishes stored observations (cache_hit), request-time observations (fresh_probe), replay rejection (nonce_reuse) and unavailable verification (verifier_error). Probe time, expiry, signing key ID and advisory decisions remain attached. A newly signed stored observation is still cached evidence, not a fresh probe.

The authenticated health-card POST signs scheduled observations. It does not execute a provider tool, authorize a downstream call or route to an alternative. Replay reservations are atomic, and callers also need their own nonce-consumption policy for offline verification.

Contract and limitations: https://agentnexus.app/guides/health-receipts

## Dev.to and Medium

Use the shared article in docs/articles/signed-health-receipts.md, also downloadable from the site guide. Canonical URL: https://agentnexus.app/guides/health-receipts.

These texts are prepared for publication after the updated site is deployed. This file does not establish that social posts or external articles were published.