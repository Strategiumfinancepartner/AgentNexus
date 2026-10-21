import { describe, expect, it } from "vitest";
import { actionOf, classifyCaller, mcpActionOf, isInternalCaller } from "./segments";

describe("classifyCaller", () => {
  it("a caller who submitted is a publisher, whatever its signature", () => {
    expect(classifyCaller("Agent-Revenue-Network/1.2.7", ["mcp", "submitted_entry"])).toBe("publisher");
  });
  it("Amazonbot and Barkrowler are crawlers", () => {
    expect(classifyCaller("Mozilla/5.0 (compatible; Amazonbot/0.1)", ["registry.entry"])).toBe("crawler");
    expect(classifyCaller("Mozilla/5.0 (compatible; Barkrowler/0.9)", [])).toBe("crawler");
  });
  it("Codex, openai-mcp, Claude-User and Zed are AI agent clients", () => {
    expect(classifyCaller("codex-mcp-client/0.163.0", ["mcp"])).toBe("ai_agent");
    expect(classifyCaller("openai-mcp/1.0.0", ["mcp"])).toBe("ai_agent");
    expect(classifyCaller("Claude-User/1.0", [])).toBe("ai_agent");
    expect(classifyCaller("Zed/1.24.2 (macos)", ["mcp"])).toBe("ai_agent");
  });
  it("ClaudeBot is a crawler, not an agent", () => {
    expect(classifyCaller("ClaudeBot/1.0", [])).toBe("crawler");
  });
  it("directory probes are monitors", () => {
    expect(classifyCaller("mcp-health-probe/0.1", ["mcp"])).toBe("monitor");
    expect(classifyCaller("BrickBlueBot/0.1", ["mcp"])).toBe("monitor");
  });
  it("curl and plain browsers are developers", () => {
    expect(classifyCaller("curl/8.5.0", ["discover"])).toBe("developer");
  });
});

describe("actionOf", () => {
  it("a moderation-status lookup is not a submission or publisher proof", () => {
    expect(actionOf("submission")).toBe("submission_status");
    expect(classifyCaller("curl/8.5.0", ["submission"])).toBe("developer");
  });
  it("catalog reads are not searches", () => {
    expect(actionOf("registry")).toBe("catalog");
    expect(actionOf("capabilities")).toBe("catalog");
  });
  it("an explicitly named Copilot probe is a monitor", () => {
    expect(classifyCaller("mcpforcopilot-probe/0.1", ["mcp"])).toBe("monitor");
  });
  it("maps surfaces to actions", () => {
    expect(actionOf("discover")).toBe("search");
    expect(actionOf("registry.entry")).toBe("entry");
    expect(actionOf("report")).toBe("report");
    expect(actionOf("mcp")).toBe("mcp");
  });
});

describe("mcpActionOf", () => {
  it("listing entries and categories does not prove a search", () => {
    expect(mcpActionOf("/mcp#tools/call:list_entries")).toBe("other_tool");
    expect(mcpActionOf("/mcp#tools/call:list_categories")).toBe("other_tool");
  });
  it("a connection is not a search", () => {
    expect(mcpActionOf("/mcp#initialize")).toBe("connect");
    expect(mcpActionOf("/mcp#tools/list")).toBe("tools_list");
  });
  it("search_registry is a search, get_entry opens an entry", () => {
    expect(mcpActionOf("/mcp#tools/call:search_registry")).toBe("search");
    expect(mcpActionOf("/mcp#tools/call:get_entry")).toBe("entry");
  });
  it("old calls without detail stay unknown", () => {
    expect(mcpActionOf("/mcp")).toBe("unknown");
  });
});

describe("activation exclusions", () => {
  it("GoogleOther is a crawler", () => {
    expect(classifyCaller("Mozilla/5.0 (compatible; GoogleOther)", [])).toBe("crawler");
  });
  it("our own test traffic is internal", () => {
    expect(isInternalCaller("ip:789e5e7a2f832ce5d6595416bfab89c4", "curl/8.14.1")).toBe(true);
    expect(isInternalCaller("ip:x", "nexus-logtest/1")).toBe(true);
    expect(isInternalCaller("ip:x", "meld-agent/1.0")).toBe(false);
  });
});
