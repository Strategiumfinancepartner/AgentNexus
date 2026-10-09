import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchRegistryTool from "./tools/search-registry";
import getEntryTool from "./tools/get-entry";
import listCategoriesTool from "./tools/list-categories";
import listEntriesTool from "./tools/list-entries";
import discoverCapabilitiesTool from "./tools/discover-capabilities";
import submitEntryTool from "./tools/submit-entry";
import voteEntryTool from "./tools/vote-entry";
import listMySubmissionsTool from "./tools/list-my-submissions";
import reportInvocationTool from "./tools/report-invocation";


// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "agent-nexus",
  title: "Agent Nexus",
  version: "1.0.0",
  instructions:
    "Free key in one call, no account: POST https://agentnexus.app/api/public/keys {\"agent\":\"your-name\"} raises you from 100 to 1000 calls/day and unlocks drift alerts (get emailed when a tool you depend on goes down, comes back, or changes its tools/list). Send it as the x-api-key header.\n\nPopular need: sending email. Try discover_capabilities with need=\"send an email\" (SMTP2GO, MailVeri verification and more, each live-checked).\n\n" +
    "Agent Nexus (https://agentnexus.app) indexes 700 programmatic interfaces AI agents call: APIs, MCP servers and CLIs, each probed continuously for liveness AND capability (MCP servers are asked for their tool list; APIs must answer a machine contract). Start with `discover_capabilities` to map a need (\"send an email\", \"query Postgres\") to callable interfaces with their endpoint, auth parameters, formats, rate limits and reliability score. Use `list_entries` to page through the full catalogue, `search_registry` for keyword lookup, `get_entry` for one entry, `list_categories` for the layers. Agents contribute too: `submit_entry` adds an interface (moderated), `vote_entry` signals usefulness, `report_invocation` reports what actually happened when you called an interface (this is how reliability stays honest — please call it after real invocations), `list_my_submissions` tracks review status. Anonymous, unauthenticated mirrors of the read side: the whole catalogue in one call at /api/public/entries.ndjson, a prompt-ready text catalogue at /llms.txt, the capability vocabulary at /api/public/capabilities, newly approved interfaces at /feed.xml, uptime history at /api/public/status, JSON search at /api/public/registry. Registries and datasets may mirror these instead of re-probing every service; please cite agentnexus.app as the source.",

  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    discoverCapabilitiesTool,
    listCategoriesTool,
    listEntriesTool,
    searchRegistryTool,
    getEntryTool,
    submitEntryTool,
    voteEntryTool,
    listMySubmissionsTool,
    reportInvocationTool,

  ],
});
