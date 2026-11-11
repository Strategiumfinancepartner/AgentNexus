# Caller-bound health receipts

Public GET health cards are unchanged. Clients may request an ES256 compact JWS with POST on the same URL:

```http
POST https://agentnexus.app/api/public/health-card/<slug>
Content-Type: application/json
x-api-key: <your Agent Nexus key>

{"nonce":"<fresh random URL-safe value, 16-128 characters>"}
```

The response contains `receipt`, the verified `principal` (`key:<key-id>`) and `jwks_url`. No raw key or email is included. Keys must be sent in headers, not URLs. Anonymous, unknown and revoked keys are rejected. Responses are `private, no-store`. Receipt requests use the existing shared key quota; no plan or limit is changed.

## Signed envelope

The envelope binds `iss`, `aud` and `sub` (verified key principal), `scope: health:read`, endpoint, slug, schema hash, negotiated protocol version, tool-list completeness, caller nonce, unique receipt ID, issue and expiry times, liveness/capability/schema observation timestamps and ages, individual probe results and aggregate verdict. The maximum lifetime is 120 seconds and is shortened at evidence expiry. Evidence is never made younger by signing it. Issuer evidence ceiling is 24 hours; clients should set a stricter maximum for their use case.

Verdicts are `up`, `down`, `degraded`, `unknown` or `stale`. Incomplete MCP pagination cannot yield `up`; missing or expired required evidence cannot yield `up`. The schema hash describes the stored contract, not a guarantee that every response or every upstream permission was exercised. A positive verdict does not imply that an untested schema has been validated; inspect `probe.schema_ok` when your policy requires this.

## Verify before invocation

Use `verifyHealthReceipt` from `src/lib/health-receipt.ts` or implement equivalent verification in your own client:

1. Pin the issuer to `https://agentnexus.app` and obtain its keys from `https://agentnexus.app/.well-known/jwks.json` over HTTPS. Never fetch a key URL supplied by an untrusted token. Require ES256, the expected token type and a trusted `kid`.
2. Verify the signature before trusting any claims.
3. Compare `aud` and `sub` with your previously established key principal. Do not accept the principal in an arbitrary token as your expected identity. Establish it using an authenticated issuance response over trusted HTTPS; configure it for subsequent checks.
4. Compare endpoint, schema hash, fixed `health:read` scope and a freshly generated nonce with your intended invocation. Do not derive your expected target/hash from the unverified token.
5. Reject future issue times, expired receipts, a lifetime longer than 120 seconds, old/missing required evidence, non-`up` verdicts and incomplete tool lists. Apply your own evidence-age and schema-validation policy.
6. Consume/discard your expected nonce after one accepted result. Generate a new nonce for each invocation decision. The verifier does not persist nonce-use state for you.

A receipt is a signed snapshot for a key holder, not provider authorization, a guarantee of future uptime, a provider response signature, or proof of a specific worker identity. Clients sharing a key share its principal. Revocation prevents new issuance but offline verification cannot detect revocation of a previously issued receipt before its short expiry. No downstream invocation is executed by Agent Nexus.

If signing is unavailable or the configured key fails verification against the published JWKS, POST returns 503 with no unsigned fallback. Public GET cards remain available. HTTPS endpoints only; local CLI/stdio targets return 422.