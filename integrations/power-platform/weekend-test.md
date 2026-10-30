# Power Automate — October 31–November 1 test

This is a private environment test of the submitted connector, not public certification. Microsoft PR #4343 remains the existing submission; do not create a duplicate.

## Before starting

- Open https://make.powerautomate.com and select your test environment.
- Confirm the account has permission to create custom connectors and the required Power Automate entitlement. Tenant policies or licensing may prevent this; do not purchase anything without checking the account first.
- Download `apiDefinition.swagger.json` from this directory.
- Have your Agent Nexus key ready privately. Never paste it into a GitHub comment, screenshot, exported flow, or test report.

## Import and connect

1. Open **Custom connectors** (under **More / Discover all** if it is not shown).
2. Choose **New custom connector → Import an OpenAPI file**, name the private test connector **Agent Nexus**, and import `apiDefinition.swagger.json`.
3. In **General**, check HTTPS, host `agentnexus.app`, base URL `/api/public`.
4. In **Security**, check **API Key** authentication, parameter name `x-api-key`, and location **Header**. Do not put the key into the definition itself.
5. Save/create the connector. In **Test**, create a new connection and enter the key into its secure field.

## Test the three operations

| Operation | Input | Evidence to record, without credentials |
| --- | --- | --- |
| DiscoverCapabilities | q: `send email`; limit: `1` | HTTP 200; a match with `slug`, `call.endpoint`, `call.auth_mode`, and `trust.last_probe_ok` |
| SearchRegistry | q: `brave`; limit: `1` | HTTP 200; `results` includes the matching entry and its `slug` |
| GetStatus | slug: `brave-search-api` | HTTP 200; `entry.health_ok`, `entry.health_checked_at`, `generated_at` |

A provider's current health may be false; a truthful unhealthy result is not a connector failure. Save operation names, UTC times, response status and redacted output—not authorization headers.

## Run one actual flow

Create an **Instant cloud flow** with a manual trigger. Add **Agent Nexus → Find a service for a task** (`send email`, limit `1`), followed by a **Compose** action using its returned `matches`. Run it and inspect the recorded output. This checks that the connector works inside a flow and that its nested fields are usable. Do not add an email-send or paid downstream action for this test: registry discovery is the task being tested here, not a claim that an email was sent.

## Report back to the existing PR

Only after the import, private-key connection, three operations and flow run succeed, update the deployment-test checklist in PR #4343. Include UTC date, environment type, operation results, and redacted evidence. If an import or operation fails, retain the exact error text without secrets so it can be corrected; do not mark the test complete.

Microsoft-side pending items remain separate: code-owner approval, an authorized maintainer launching Azure validation if required, and clarification of the independent-publisher title/publisher convention. Keep the exact Agent Nexus brand pending their answer.