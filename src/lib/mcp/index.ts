import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchRegistryTool from "./tools/search-registry";
import getEntryTool from "./tools/get-entry";
import listCategoriesTool from "./tools/list-categories";
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
  version: "0.2.0",
  instructions:
    "Agent Nexus indexes the programmatic interfaces AI agents call: APIs, MCP servers and CLIs, each health-checked continuously. Start with `discover_capabilities` to map a need (\"send an email\", \"query Postgres\") to callable interfaces with their endpoint, auth parameters, formats, rate limits and reliability score. Use `search_registry` for keyword lookup, `get_entry` for one entry, `list_categories` for the layers. Agents can also contribute: `submit_entry` adds an interface (moderated), `vote_entry` signals usefulness, `list_my_submissions` tracks review status. An anonymous, unauthenticated mirror of the read side is available at /llms.txt and /api/public/registry.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    discoverCapabilitiesTool,
    listCategoriesTool,
    searchRegistryTool,
    getEntryTool,
    submitEntryTool,
    voteEntryTool,
    listMySubmissionsTool,
  ],
});
