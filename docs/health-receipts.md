# Caller-bound health receipts

Public GET health cards are unchanged. Clients may request an ES256 compact JWS with POST on the same URL:

```http
POST https://agentnexus.app/api/public/health-card/<slug>
Content-Type: application/json
x-api-key: <your Agent Nexus key>

{"nonce":"<fresh random URL-safe value, 16-128 characters>"}
```

The response contains `receipt`, the verified `principal` (`key:<key-id>`) and `jwks_url`. No raw key or email is included. Keys must be sent in headers, not URLs. Anonymous, unknown and revoked keys are rejected. Responses are `private, no-store`. Receipt requests use the existing shared key quota; no plan or limit is changed.

## Typed outcomes and advisory decisions

| Outcome | Meaning | Route decision |
| --- | --- | --- |
| `cache_hit` | The receipt uses stored scheduled observations, even if recent. This is the normal POST result. | `inspect_evidence` |
| `fresh_probe` | Every required observation was performed during the probe request. Supported by the producer/verifier contract; health-card POST does not execute a fresh provider probe. | `inspect_evidence` |
| `nonce_reuse` | This principal already reserved this nonce, or the caller already consumed it. Issuance returns HTTP 409 with signed rejection evidence. | `reject_replay` |
| `verifier_error` | Signature/context/freshness verification or replay storage could not complete. Issuance infrastructure failure returns HTTP 503, no receipt. This does not establish a provider outage. | `retry_verification` |

Every result carries `probe_time` (liveness observation, not issue time), `expiry` (Unix seconds, corresponding to signed `exp`), `key_id` (signing key ID, not caller API key), and `route_decision`. Signed claims contain `outcome`, `probe_time`, `key_id`, and `route_decision`; compare them with the JWS header and evidence. On unverifiable errors, `probe_time` and `expiry` are explicitly null: unknown evidence is not fabricated. A reported key ID is only a verification context until the signature is trusted. Routing is advisory, never execution permission or an automatic fallback.

The typed verifier preserves authenticated stale or unhealthy evidence as `cache_hit` or `fresh_probe` with `policy_accepted: false`, rather than reporting it as failed signature verification. It does not consume the nonce for policy-rejected evidence. A signed `nonce_reuse` remains a replay rejection even if its underlying health evidence is stale. `policy_accepted` is a caller-local check, not signed execution authorization; only the strict verifier enforces acceptance for invocation evaluation.

Issuance atomically reserves a hash of the nonce for the verified principal for 24 hours, across all health-card routes and concurrent requests. Different principals have separate nonce namespaces. After a reservation, a signing failure still consumes that nonce; retry with a new one. This retention window exceeds the 120-second maximum receipt lifetime. Invalid requests do not reserve a nonce. Public GETs are unchanged and do not use the replay ledger.

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
6. Consume your expected nonce atomically after one accepted result. Generate a new nonce for each invocation decision. `verifyHealthReceiptResult` accepts an asynchronous `consumeNonce(principal, nonce)` callback backed by your durable store: return true only on the first consumption, false on reuse, and throw on store failure. It returns the four distinct outcomes, retains authenticated context for replay, and never echoes unverified token timestamps as trusted error evidence. The legacy throwing `verifyHealthReceipt` remains available, accepts legacy receipts and rejects signed rejection outcomes; it does not consume nonces itself.

A receipt is a signed snapshot for a key holder, not provider authorization, a guarantee of future uptime, a provider response signature, or proof of a specific worker identity. Clients sharing a key share its principal. Revocation prevents new issuance but offline verification cannot detect revocation of a previously issued receipt before its short expiry. No downstream invocation is executed by Agent Nexus.

If signing is unavailable or the configured key fails verification against the published JWKS, POST returns 503 with no unsigned fallback. Public GET cards remain available. HTTPS endpoints only; local CLI/stdio targets return 422.