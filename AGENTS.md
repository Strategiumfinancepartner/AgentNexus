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

- Schema validation is a third probe layer (liveness → capability → schema) in `src/lib/schema-probe.server.ts`, keyed by entry slug in `SCHEMA_PROFILES`; only pinned entries (AI APIs first) are shape-checked. Why: a 200 that parses but misses a required field is the failure agents hit hardest, and error envelopes are the honest contract verifiable without provider keys.
- The site root accepts MCP JSON-RPC POSTs through the anonymous MCP handler as a compatibility fallback. Why: some directory checkers test the website URL instead of the declared endpoint.
- Agent-key submissions are limited to 1 per key AND 1 per source address per 24h (src/lib/mcp/agent-submit.server.ts). Why: one operator minted 15 keys in 20h to bypass the per-key limit.
- Reviewer analytics exclude command-injection probes from demand gaps and split MCP traffic by anonymous versus keyed calls; MCP handshakes are not discovery quota usage. Why: repeated scanner traffic must not be mistaken for customer demand or active keys.

- After every code change, mirror the project to GitHub Strategiumfinancepartner/AgentNexus with `python3 scripts/github-sync.py` (needs LOVABLE_API_KEY + GITHUB_API_KEY). Why: M8ven Live re-scores the listing from that repo on each push, and Lovable sync does not target it.
