import { describe, expect, it } from "vitest";
import { actionOf, classifyCaller } from "./segments";

describe("classifyCaller", () => {
  it("a caller who submitted is a publisher, whatever its signature", () => {
    expect(classifyCaller("Agent-Revenue-Network/1.2.7", ["mcp", "submission"])).toBe("publisher");
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
  it("maps surfaces to actions", () => {
    expect(actionOf("discover")).toBe("search");
    expect(actionOf("registry.entry")).toBe("entry");
    expect(actionOf("report")).toBe("report");
    expect(actionOf("mcp")).toBe("mcp");
  });
});
