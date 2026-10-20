/** Which channel minted an API key, guessed from the caller's user-agent. Unverified signal. */
const RULES: [RegExp, string][] = [
  [/langchain-agent-nexus/i, "langchain"],
  [/crewai-agent-nexus/i, "crewai"],
  [/llama-index-tools-agent-nexus/i, "llamaindex"],
  [/agentnexus-client-py/i, "python-sdk"],
  [/n8n-nodes-agentnexus|\bn8n\b/i, "n8n"],
  [/agentnexus-mcp/i, "mcp-stdio"],
  [/agentnexus-js/i, "npm"],
  [/(codex|openai-mcp|chatgpt)/i, "openai"],
  [/(claude|anthropic)/i, "claude"],
  [/(cursor|windsurf|cline|zed\/|opencode|gemini|copilot|continue|perplexity)/i, "ai-client"],
  [/^curl\//i, "curl"],
  [/(python-|aiohttp|pip\/)/i, "python-other"],
  [/(^node|undici|axios|node-fetch)/i, "node-other"],
  [/mozilla/i, "browser"],
];

export function keyOrigin(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  for (const [re, origin] of RULES) if (re.test(ua)) return origin;
  return ua ? "other" : "unknown";
}
