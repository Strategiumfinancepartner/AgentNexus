import { createFileRoute } from "@tanstack/react-router";
import { Route as A2A } from "@/routes/api/public/a2a";

/**
 * /mcp/v1/message:send (and other A2A REST-style "noun:verb" paths) — some A2A
 * clients guess the REST binding under our MCP path. Wrap the REST body into a
 * JSON-RPC envelope and answer through the real A2A endpoint instead of a 404.
 */
async function forward(request: Request, action: string): Promise<Response> {
  const method = action.replace(":", "/");
  const raw = await request.text().catch(() => "");
  let params: unknown = {};
  try {
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && (parsed as any).jsonrpc) {
      params = (parsed as any).params ?? {};
    } else params = parsed;
  } catch {
    params = {};
  }
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  const rewritten = new Request(new URL("/api/public/a2a", request.url), {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const handlers = (A2A.options as any).server.handlers;
  return handlers.POST({ request: rewritten });
}

export const Route = createFileRoute("/mcp/v1/$action")({
  server: {
    handlers: {
      OPTIONS: async () => (A2A.options as any).server.handlers.OPTIONS(),
      POST: async ({ request, params }: any) => forward(request, params.action),
      GET: async ({ request }: any) => (A2A.options as any).server.handlers.GET({ request }),
    },
  },
});
