// Browser-safe step-by-step guides for plugging Agent Nexus into AI clients.
const MCP = "https://agentnexus.app/mcp";
const API = "https://agentnexus.app/api/public";

export type GuideStep = { title: string; text: string; code?: string };
export type ClientGuide = {
  slug: string;
  client: string;
  vendor: string;
  summary: string;
  steps: GuideStep[];
  verify: string;
  docs: string;
};

const TEST_PROMPT =
  'Ask the assistant: "Use Agent Nexus to find an API that sends transactional email, and show its health." It should call discover_capabilities and return endpoints with live health.';

export const CLIENT_GUIDES: ClientGuide[] = [
  {
    slug: "meta-muse-spark",
    client: "Meta Muse Spark",
    vendor: "Meta Model API",
    summary:
      "Muse Spark (muse-spark-1.3) is OpenAI-SDK compatible and trained for tool loops. Expose Agent Nexus as a function tool, or add the MCP server to the agent harness running Muse Spark.",
    steps: [
      {
        title: "Get a Meta Model API key",
        text: "Sign up at dev.meta.ai, create a key and export it. Base URL: https://api.meta.ai/v1.",
        code: "export MODEL_API_KEY=...",
      },
      {
        title: "Option A — harness with MCP (OpenCode, Goose, Roo…)",
        text: "Pick Muse Spark as the model in your harness, then add Agent Nexus as a remote MCP server. Example for OpenCode (opencode.json):",
        code: JSON.stringify(
          { mcp: { "agent-nexus": { type: "remote", url: MCP, enabled: true } } },
          null,
          2,
        ),
      },
      {
        title: "Option B — direct API with a function tool",
        text: "Declare a discover tool, let Muse Spark call it, and answer the call with the Agent Nexus HTTP API (no key needed for reads).",
        code: `import json, os, urllib.parse, urllib.request
from openai import OpenAI

client = OpenAI(base_url="https://api.meta.ai/v1", api_key=os.environ["MODEL_API_KEY"])
tools = [{"type": "function", "function": {
  "name": "discover_capabilities",
  "description": "Find a callable API/MCP/CLI for a need, with live health.",
  "parameters": {"type": "object", "properties": {"need": {"type": "string"}}, "required": ["need"]}}}]

def discover(need):
    url = "${API}/discover?need=" + urllib.parse.quote(need)
    with urllib.request.urlopen(url) as r:
        return r.read().decode()

messages = [{"role": "user", "content": "Find an API to send transactional email."}]
resp = client.chat.completions.create(model="muse-spark-1.3", messages=messages, tools=tools)
call = resp.choices[0].message.tool_calls[0]
messages += [resp.choices[0].message, {"role": "tool", "tool_call_id": call.id,
  "content": discover(json.loads(call.function.arguments)["need"])}]
print(client.chat.completions.create(model="muse-spark-1.3", messages=messages).choices[0].message.content)`,
      },
    ],
    verify: TEST_PROMPT,
    docs: "https://dev.meta.ai/docs/quickstart",
  },
  {
    slug: "codex",
    client: "OpenAI Codex CLI",
    vendor: "OpenAI",
    summary: "Add Agent Nexus to Codex as a streamable HTTP MCP server.",
    steps: [
      {
        title: "Edit ~/.codex/config.toml",
        text: "Add the server block, then restart Codex.",
        code: `[mcp_servers.agent-nexus]\nurl = "${MCP}"`,
      },
      { title: "Check it loaded", text: "Inside Codex, run /mcp to list connected servers.", code: "/mcp" },
    ],
    verify: TEST_PROMPT,
    docs: "https://github.com/openai/codex",
  },
  {
    slug: "vscode",
    client: "VS Code + GitHub Copilot",
    vendor: "Microsoft",
    summary: "Copilot agent mode reads MCP servers from .vscode/mcp.json.",
    steps: [
      {
        title: "Create .vscode/mcp.json in your project",
        text: "Or run “MCP: Add Server” from the command palette and paste the URL.",
        code: JSON.stringify({ servers: { "agent-nexus": { type: "http", url: MCP } } }, null, 2),
      },
      { title: "Start the server", text: "Click “Start” above the entry, then open Copilot Chat in Agent mode." },
    ],
    verify: TEST_PROMPT,
    docs: "https://code.visualstudio.com/docs/copilot/chat/mcp-servers",
  },
  {
    slug: "claude-code",
    client: "Claude Code",
    vendor: "Anthropic",
    summary: "One command adds Agent Nexus over HTTP.",
    steps: [
      { title: "Add the server", text: "Run in your terminal:", code: `claude mcp add --transport http agent-nexus ${MCP}` },
      { title: "Check it", text: "Run /mcp inside Claude Code.", code: "/mcp" },
    ],
    verify: TEST_PROMPT,
    docs: "https://docs.anthropic.com/en/docs/claude-code/mcp",
  },
  {
    slug: "cursor",
    client: "Cursor",
    vendor: "Anysphere",
    summary: "Global (~/.cursor/mcp.json) or per-project (.cursor/mcp.json).",
    steps: [
      {
        title: "Edit mcp.json",
        text: "Then enable it in Settings → MCP.",
        code: JSON.stringify({ mcpServers: { "agent-nexus": { url: MCP } } }, null, 2),
      },
    ],
    verify: TEST_PROMPT,
    docs: "https://docs.cursor.com/context/model-context-protocol",
  },
  {
    slug: "windsurf",
    client: "Windsurf",
    vendor: "Codeium",
    summary: "Windsurf Cascade reads ~/.codeium/windsurf/mcp_config.json.",
    steps: [
      {
        title: "Edit mcp_config.json",
        text: "Then refresh the MCP list in Cascade.",
        code: JSON.stringify({ mcpServers: { "agent-nexus": { serverUrl: MCP } } }, null, 2),
      },
    ],
    verify: TEST_PROMPT,
    docs: "https://docs.windsurf.com/windsurf/cascade/mcp",
  },
  {
    slug: "gemini-cli",
    client: "Gemini CLI",
    vendor: "Google",
    summary: "Gemini CLI reads MCP servers from ~/.gemini/settings.json.",
    steps: [
      {
        title: "Edit settings.json",
        text: "Use httpUrl for streamable HTTP servers.",
        code: JSON.stringify({ mcpServers: { "agent-nexus": { httpUrl: MCP } } }, null, 2),
      },
      { title: "Check it", text: "Run /mcp inside Gemini CLI.", code: "/mcp" },
    ],
    verify: TEST_PROMPT,
    docs: "https://github.com/google-gemini/gemini-cli",
  },
  {
    slug: "opencode",
    client: "OpenCode",
    vendor: "SST",
    summary: "Remote MCP in opencode.json — works with any model, including Muse Spark.",
    steps: [
      {
        title: "Edit opencode.json",
        text: "Project root or ~/.config/opencode/opencode.json.",
        code: JSON.stringify({ mcp: { "agent-nexus": { type: "remote", url: MCP, enabled: true } } }, null, 2),
      },
    ],
    verify: TEST_PROMPT,
    docs: "https://opencode.ai/docs/mcp-servers/",
  },
  {
    slug: "workbuddy",
    client: "WorkBuddy",
    vendor: "Tencent",
    summary: "Remote MCP (Streamable HTTP) in WorkBuddy's MCP settings. No install, no local server.",
    steps: [
      {
        title: "Open MCP settings",
        text: "In WorkBuddy, open Settings, then MCP, and choose to add a remote server (Streamable HTTP).",
      },
      {
        title: "Add Agent Nexus",
        text: "Paste this configuration, or fill the URL field. A free key (1,000 calls/day) is optional: add it as an Authorization header.",
        code: JSON.stringify({ mcpServers: { "agent-nexus": { type: "streamableHttp", url: MCP, headers: { Authorization: "Bearer nx_your_key_optional" } } } }, null, 2),
      },
      {
        title: "Approve the tools",
        text: "Enable the server and approve the read-only Agent Nexus tools when WorkBuddy asks.",
      },
    ],
    verify: TEST_PROMPT,
    docs: "https://www.workbuddy.ai",
  },
];

export function getClientGuide(slug: string) {
  return CLIENT_GUIDES.find((g) => g.slug === slug);
}
