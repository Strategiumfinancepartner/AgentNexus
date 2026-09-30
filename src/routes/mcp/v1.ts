import { createFileRoute } from "@tanstack/react-router";
import { mcpHandler } from "../mcp";

// /mcp/v1 — alias some clients (BrickBlueBot) guess; same server as /mcp.
export const Route = createFileRoute("/mcp/v1")({
  server: { handlers: { ANY: async (ctx: any) => mcpHandler(ctx) } },
});
