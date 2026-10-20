import { describe, expect, it } from "vitest";
import { keyOrigin } from "./key-origin";

describe("keyOrigin", () => {
  it("recognises our packages", () => {
    expect(keyOrigin("agentnexus-client-py/0.1.0")).toBe("python-sdk");
    expect(keyOrigin("langchain-agent-nexus/0.1.0")).toBe("langchain");
    expect(keyOrigin("n8n-nodes-agentnexus/0.1.6")).toBe("n8n");
    expect(keyOrigin("agentnexus-js/0.1.2")).toBe("npm");
  });
  it("recognises AI clients and generic tools", () => {
    expect(keyOrigin("openai-mcp/1.0.0")).toBe("openai");
    expect(keyOrigin("python-httpx/0.28.1")).toBe("python-other");
    expect(keyOrigin("")).toBe("unknown");
  });
});
