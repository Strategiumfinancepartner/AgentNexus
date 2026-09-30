import { createFileRoute } from "@tanstack/react-router";

// /.well-known/x402 — x402 v0.4 self-description (free-only, like the
// directory servers we mirror). Agent Nexus never charges per call;
// discovery is anonymous, higher quotas come via API keys / plans
// (see /.well-known/pricing.json), not via x402 per-request payment.
export const Route = createFileRoute("/.well-known/x402")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            name: "Agent Nexus",
            url: "https://agentnexus.app",
            description:
              "Verified API registry for AI agents — health checks, machine-readable discovery manifests and tested invocation examples across 149+ entries. Discovery is free and anonymous; higher quotas via self-serve API keys and plans, not per-call payment.",
            version: "0.4",
            free_only: true,
            endpoints: [
              { path: "/mcp", method: "POST", kind: "mcp-streamable-http", gated: false },
              { path: "/api/public/discover", method: "GET", kind: "rest-json", gated: false, category: "registry" },
              { path: "/api/public/registry/{slug}", method: "GET", kind: "rest-json", gated: false, category: "registry" },
              { path: "/openapi.json", method: "GET", kind: "openapi", gated: false },
              { path: "/.well-known/pricing.json", method: "GET", kind: "pricing", gated: false },
              { path: "/api/public/keys", method: "POST", kind: "rest-json", gated: false, category: "self-serve-keys" },
            ],
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600",
              "Access-Control-Allow-Origin": "*",
            },
          },
        ),
    },
  },
});
