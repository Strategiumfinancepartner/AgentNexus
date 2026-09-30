import { createFileRoute } from "@tanstack/react-router";

// /.well-known/x402.json — same manifest as /.well-known/x402.
// Some directory verifiers (e.g. Agent Tools x402) probe the .json
// variant specifically; serve the identical payload here.
export const Route = createFileRoute("/.well-known/x402.json")({
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
