import { createFileRoute } from "@tanstack/react-router";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

/**
 * OpenAPI 3.1 description of the anonymous surface.
 * Lets tool-calling agents (GPT Actions, LangChain OpenAPI toolkits, n8n,
 * Zapier-style runners) import Nexus without any bespoke integration code.
 */
const serveSpec = async ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin;

        const entry = {
          type: "object",
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            category: { type: "string", enum: ["api", "mcp", "cli"] },
            summary: { type: "string" },
            endpoint: { type: "string" },
            auth_mode: { type: "string" },
            capabilities: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            input_format: { type: ["string", "null"] },
            output_format: { type: ["string", "null"] },
            rate_limit: { type: ["string", "null"] },
            pricing: { type: ["string", "null"] },
            invocation_example: { type: ["string", "null"] },
            verified: { type: "boolean" },
            health_ok: { type: ["boolean", "null"] },
            avg_latency_ms: { type: ["number", "null"] },
          },
          required: ["slug", "name", "category", "summary", "endpoint", "auth_mode"],
        };

        const spec = {
          openapi: "3.1.0",
          info: {
            title: "Agent Nexus (agentnexus.app)",
            version: "0.4.0",
            description:
              "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call. Every endpoint below is anonymous: no key, no account.",
            contact: { url: `${origin}/connect` },
          },
          servers: [{ url: origin }],
          paths: {
            "/api/public/keys": {
              post: {
                operationId: "createApiKey",
                summary:
                  "Mint your own free API key instantly — no account, no email, no human approval",
                description:
                  "Self-service registration for autonomous agents and developers. The key is returned once in the response body; send it as the x-api-key header on any /api/public/* request to raise the daily quota from 100 to 1000 calls.",
                requestBody: {
                  required: false,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          agent: { type: "string", maxLength: 80, example: "my-agent" },
                          purpose: { type: "string", maxLength: 200, example: "tool discovery" },
                        },
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Key issued (shown once)",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            key: { type: "string", example: "nx_…" },
                            tier: { type: "string", example: "free" },
                            daily_limit: { type: "integer" },
                            header: { type: "string", example: "x-api-key" },
                          },
                        },
                      },
                    },
                  },
                  "429": { description: "Up to 5 self-service keys per source per 24h" },
                },
              },
            },
            "/api/public/discover": {
              get: {
                operationId: "discoverCapabilities",
                summary: "Map a natural-language need to callable interfaces",
                parameters: [
                  {
                    name: "need",
                    in: "query",
                    required: true,
                    schema: { type: "string", minLength: 3, maxLength: 300 },
                    example: "send a transactional email",
                  },
                  {
                    name: "category",
                    in: "query",
                    schema: { type: "string", enum: ["api", "mcp", "cli"] },
                  },
                  {
                    name: "min_reliability",
                    in: "query",
                    schema: { type: "integer", minimum: 0, maximum: 100 },
                  },
                  {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", minimum: 1, maximum: 20, default: 5 },
                  },
                ],
                responses: {
                  "200": {
                    description: "Ranked matches with call contract and trust signals",
                    content: { "application/json": { schema: { type: "object" } } },
                  },
                },
              },
            },
            "/api/public/registry": {
              get: {
                operationId: "searchRegistry",
                summary: "Keyword search across the registry",
                parameters: [
                  { name: "q", in: "query", schema: { type: "string", maxLength: 120 } },
                  {
                    name: "category",
                    in: "query",
                    schema: { type: "string", enum: ["api", "mcp", "cli"] },
                  },
                  {
                    name: "limit",
                    in: "query",
                    schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
                  },
                ],
                responses: {
                  "200": {
                    description: "Matching entries",
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            count: { type: "integer" },
                            results: { type: "array", items: entry },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "/api/public/registry/{slug}": {
              get: {
                operationId: "getEntry",
                summary: "Full machine contract for one interface",
                parameters: [
                  { name: "slug", in: "path", required: true, schema: { type: "string" } },
                ],
                responses: {
                  "200": {
                    description: "Entry",
                    content: { "application/json": { schema: entry } },
                  },
                  "404": { description: "Unknown slug" },
                },
              },
            },
            "/api/public/capabilities": {
              get: {
                operationId: "listCapabilities",
                summary: "Vocabulary of capabilities, tags and categories in the registry",
                responses: {
                  "200": {
                    description: "Capability index",
                    content: { "application/json": { schema: { type: "object" } } },
                  },
                },
              },
            },
            "/api/public/entries.ndjson": {
              get: {
                operationId: "streamEntries",
                summary: "Bulk newline-delimited JSON dump of the whole catalog",
                responses: {
                  "200": {
                    description: "One entry per line",
                    content: { "application/x-ndjson": { schema: { type: "string" } } },
                  },
                },
              },
            },
            "/api/public/status": {
              get: {
                operationId: "getStatus",
                summary: "30-day uptime, latency and incident history for every approved interface",
                parameters: [
                  {
                    name: "slug",
                    in: "query",
                    required: false,
                    schema: { type: "string" },
                    description: "Limit the history to a single interface",
                  },
                ],
                responses: {
                  "200": {
                    description: "Reliability history",
                    content: { "application/json": { schema: { type: "object" } } },
                  },
                  "404": { description: "Unknown slug" },
                },
              },
            },
            "/api/public/report": {
              post: {
                operationId: "reportInvocation",
                summary: "Close the loop after calling an interface",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          slug: { type: "string" },
                          outcome: {
                            type: "string",
                            enum: ["success", "failure", "auth_error", "rate_limited", "timeout"],
                          },
                          latency_ms: { type: "integer" },
                          note: { type: "string" },
                        },
                        required: ["slug", "outcome"],
                      },
                    },
                  },
                },
                responses: { "200": { description: "Recorded" } },
              },
            },
          },
        };

  return new Response(JSON.stringify(spec, null, 2), { headers });
};

export const Route = createFileRoute("/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      // Crawlers POST at the spec URL; serve it for any read method.
      GET: async (ctx: any) => serveSpec(ctx),
      HEAD: async (ctx: any) => serveSpec(ctx),
      POST: async (ctx: any) => serveSpec(ctx),
    },
  },
});
