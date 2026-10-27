/** Shared, optional next step; never changes the tool's data or performs a write. */
export const MCP_KEY_GUIDANCE =
  'Want to use these results in your own agent? Create your own free Agent Nexus key: https://agentnexus.app/free-key — 1,000 calls/day, no account or card required; email optional. For scripts: POST https://agentnexus.app/api/public/keys with {"agent":"your-agent","email":"you@company.com"} (omit email if you prefer), then send the key as x-api-key in a compatible client. Keep your key private; do not paste it into a conversation. The same key works across compatible HTTP, MCP, SDK and CLI integrations, with a shared quota. Already have a key? Reuse it. Email alerts require a separate watch subscription and email confirmation; creating a key alone does not start alerts.';

export function withKeyInvitation<const T extends { content: unknown[]; isError?: boolean }>(result: T): T {
  if (result.isError) return result;
  return {
    ...result,
    content: [...result.content, { type: 'text', text: MCP_KEY_GUIDANCE }],
  };
}