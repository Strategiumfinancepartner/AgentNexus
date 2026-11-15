# Health receipt communications

## Reply to the technical comment

Agreed. The receipt binds evidence source, verifier build and an explicit decision expiry alongside the typed outcome. Agents can cache the observation, preserving its original timestamp, without renewing the advisory decision. A fresh signature never makes stored evidence a fresh probe. Evidence only, never execution authority.

## X post

A fresh signature is not a fresh health check.

Agent Nexus keeps cached evidence, fresh probes, nonce reuse and verification errors distinct. Signed receipts bind the evidence source, verifier build and decision expiry. Cache the observation, not execution authority.

https://agentnexus.app/guides/health-receipts

## LinkedIn post

An AI agent should not have to interpret every failed health receipt as the same problem.

Agent Nexus distinguishes stored observations (cache_hit), request-time observations (fresh_probe), replay rejection (nonce_reuse) and unavailable verification (verifier_error). Probe time, expiry, signing key ID, evidence source, verifier build and explicit advisory decision expiry remain attached. Agents can cache observations with their original dates, but an expired decision cannot pass acceptance policy. A newly signed stored observation is still cached evidence, not a fresh probe.

The authenticated health-card POST signs scheduled observations. It does not execute a provider tool, authorize a downstream call or route to an alternative. Replay reservations are atomic, and callers also need their own nonce-consumption policy for offline verification.

Contract and limitations: https://agentnexus.app/guides/health-receipts

## Dev.to and Medium

Use the shared article in docs/articles/signed-health-receipts.md, also downloadable from the site guide. Canonical URL: https://agentnexus.app/guides/health-receipts.

These texts are prepared for publication after the updated site is deployed. This file does not establish that social posts or external articles were published.