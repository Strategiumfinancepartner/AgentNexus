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
export const Route = createFileRoute("/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async ({ request }) => {
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
            title: "Agent Nexus",
            version: "0.4.0",
            description:
              "Continuously verified registry of the APIs, MCP servers and CLIs that AI agents call. Every endpoint below is anonymous: no key, no account.",
            contact: { url: `${origin}/connect` },
          },
          servers: [{ url: origin }],
          paths: {
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
      },
    },
  },
});
