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
import { MCP_INSTRUCTIONS } from "./instructions";


// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "agent-nexus",
  title: "Agent Nexus",
  version: "1.1.0",
  instructions: MCP_INSTRUCTIONS,

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
