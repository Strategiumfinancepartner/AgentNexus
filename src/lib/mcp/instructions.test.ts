import { describe, expect, it } from "vitest";
import { MCP_INSTRUCTIONS } from "./instructions";

describe("MCP instructions", () => {
  it("routes plain-language goals to discover_capabilities", () => {
    expect(MCP_INSTRUCTIONS).toContain("For a plain-language goal, use discover_capabilities");
  });
  it("carries no quota, key or pricing offer", () => {
    expect(MCP_INSTRUCTIONS).not.toMatch(/\bPro\b|1,000|50,000|api key|\$/i);
  });
});
