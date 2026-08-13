import { defineMcp } from "@lovable.dev/mcp-js";
import searchRegistryTool from "./tools/search-registry";
import getEntryTool from "./tools/get-entry";
import listCategoriesTool from "./tools/list-categories";

export default defineMcp({
  name: "agent-nexus",
  title: "Agent Nexus",
  version: "0.1.0",
  instructions:
    "Agent Nexus indexes the programmatic interfaces AI agents call: APIs, MCP servers and CLIs. Use `list_categories` for the layers, `search_registry` to find a callable surface by keyword, and `get_entry` for its endpoint and auth method. All data is public.",
  tools: [listCategoriesTool, searchRegistryTool, getEntryTool],
});
