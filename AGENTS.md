<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture

- Paid checkout returns explicitly request bounded refreshes of server-confirmed access and key quotas before showing onboarding; return parameters never grant access. Why: payment notifications may arrive after the first cached Free read.

- Pinned publisher data-quality checks run every hourly probe cycle independently of catalog rotation, persist their evidence in schema_detail, and feed confirmed watches with freshness and volume transitions. Why: an HTTP 200 does not establish that the returned data is current or complete.

- Subscription purchase intents persist in same-origin session storage with an expiry and return through public auth after session hydration to a validated pricing plan; checkout revalidates the account and returns to key onboarding. Why: OAuth callbacks can lose query parameters or finish session hydration after the page mounts.

- Schema validation is a third probe layer (liveness → capability → schema) in `src/lib/schema-probe.server.ts`, keyed by entry slug in `SCHEMA_PROFILES`; only pinned entries (AI APIs first) are shape-checked. Why: a 200 that parses but misses a required field is the failure agents hit hardest, and error envelopes are the honest contract verifiable without provider keys.
- The site root accepts MCP JSON-RPC POSTs through the anonymous MCP handler as a compatibility fallback. Why: some directory checkers test the website URL instead of the declared endpoint.
- Agent-key submissions are limited to 1 per key AND 1 per source address per 24h (src/lib/mcp/agent-submit.server.ts). Why: one operator minted 15 keys in 20h to bypass the per-key limit.
- Reviewer analytics exclude command-injection probes from demand gaps and split MCP traffic by anonymous versus keyed calls; MCP handshakes are not discovery quota usage. Why: repeated scanner traffic must not be mistaken for customer demand or active keys.

- After every code change, mirror the project to GitHub Strategiumfinancepartner/AgentNexus with `python3 scripts/github-sync.py` (needs LOVABLE_API_KEY + GITHUB_API_KEY). Why: M8ven Live re-scores the listing from that repo on each push, and Lovable sync does not target it.
- Per-entry agent health cards live at /api/public/health-card/<slug> (probe, transport, auth shape, schema hash, proof, last failure, retry cost). Why: agents rank servers on live evidence, not READMEs.
- Caller segmentation (publisher > crawler > ai_agent > monitor > developer) lives in src/lib/segments.ts and feeds the Audience 'Segments' tab. Why: monitor recurrence must never be read as user retention.
- Segment searches exclude catalog listing; publisher attribution requires entry ownership, and explicit probe signatures remain monitors. Why: status lookups, handshakes, and tool enumeration are not customer intent.
- Liveness HTTP attempts have independent timeouts and outage confirmation uses GET directly. Why: a timed-out HEAD must not make a working MCP endpoint appear offline.
- Each API key records its minting channel in api_keys.origin, guessed from the user-agent by src/lib/key-origin.ts. Why: to know which distribution channel (SDKs, npm, n8n, AI clients, site) produces keys; it is an unverified signal.
- Publisher reports (src/lib/entry-report.ts) count search appearances from entry_appearances and opens from access_events (HTTP path or MCP `get_entry?slug=`), excluding crawlers/monitors from headline numbers; visible only to the submitter or reviewers. Why: publishers pay for evidence of real agent attention, not robot traffic.
