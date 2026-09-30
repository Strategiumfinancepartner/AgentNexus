import { createFileRoute } from "@tanstack/react-router";

// SaSame MCP Observatory — recommended machine-readable observation record.
// See https://srl-sasame.com/documentation/observatory
const record = {
  observed_by: "SaSame",
  subject_url: "https://agentnexus.app/mcp",
  label: "Observed by SaSame — owner confirmed via .well-known/mcp-ready-claim.txt",
  public_record_url:
    "https://live-vps.sasame.online/observatory/check/?url=https%3A%2F%2Fagentnexus.app%2Fmcp",
  badge_url: "https://live-vps.sasame.online/observatory/badge/agentnexus-app-mcp.svg",
  ownership_proof: "https://agentnexus.app/.well-known/mcp-ready-claim.txt",
};

export const Route = createFileRoute("/.well-known/sasame-observation.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(record, null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
