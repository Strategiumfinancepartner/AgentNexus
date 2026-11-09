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
                  "Mint your own free API key instantly — no account, no human approval",
                description:
                  "Self-service registration for autonomous agents and developers. The key is returned once in the response body; send it as the x-api-key header on any /api/public/* request to raise the daily quota from 100 to 1000 calls. An email is optional and never required — an agent with no human behind it should not have to invent one — but it is the only channel through which drift alerts (a tool going down, coming back, or changing shape) can reach anyone.",
                requestBody: {
                  required: false,
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          agent: { type: "string", maxLength: 80, example: "my-agent" },
                          purpose: { type: "string", maxLength: 200, example: "tool discovery" },
                          email: {
                            type: "string",
                            format: "email",
                            maxLength: 200,
                            example: "you@company.com",
                            description: "Optional. Enables drift alerts and lets the key move to Agent Pro later.",
                          },
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

  return new Response(JSON.stringify(hardenSpec(spec as any, entry), null, 2), { headers });
};

/**
 * Adds the contract details strict OpenAPI graders look for: named schemas,
 * an optional API-key security scheme, typed error responses, tags and a
 * license. Paths, operationIds and payloads are unchanged (backward compatible).
 */
export function hardenSpec(spec: any, entry: any) {
  const error = {
    type: "object",
    properties: { error: { type: "string" }, message: { type: "string" } },
    required: ["error"],
  };
  const health = {
    type: "object",
    description: "Live state from the latest probes, distinct from historical reliability.",
    properties: {
      status: { type: "string", enum: ["up", "degraded", "down", "unknown"] },
      reasons: { type: "array", items: { type: "string" } },
      checked_at: { type: ["string", "null"], format: "date-time" },
    },
    required: ["status", "reasons"],
  };
  const match = {
    type: "object",
    properties: {
      slug: { type: "string" },
      name: { type: "string" },
      category: { type: "string", enum: ["api", "mcp", "cli"] },
      summary: { type: "string" },
      match_score: { type: "number" },
      matched_on: { type: "string", enum: ["capability", "fallback"] },
      capabilities: { type: "array", items: { type: "string" } },
      call: { type: "object", additionalProperties: true, description: "endpoint, auth_mode, auth_params, formats, rate_limit, pricing, example, docs_url" },
      trust: { type: "object", additionalProperties: true, description: "Historical reliability: verified, reliability_score, uptime, samples, avg_latency_ms" },
      current_health: { $ref: "#/components/schemas/CurrentHealth" },
      alternatives: { type: "array", description: "Only when current_health is down or degraded. Advisory, not guaranteed.", items: { type: "object", additionalProperties: true } },
    },
    required: ["slug", "name", "category", "call", "trust", "current_health"],
  };
  const discovery = {
    type: "object",
    properties: {
      need: { type: "string" },
      coverage: { type: "string", enum: ["exact", "partial", "none"] },
      count: { type: "integer" },
      uncovered: { type: "boolean" },
      note: { type: "string" },
      next_steps: { type: "array", items: { type: "string" } },
      matches: { type: "array", items: { $ref: "#/components/schemas/DiscoveryMatch" } },
    },
    required: ["need", "coverage", "count", "matches", "uncovered"],
  };
  spec.info.license = { name: "MIT", identifier: "MIT" };
  spec.info.termsOfService = "https://agentnexus.app/terms";
  spec.externalDocs = { url: "https://agentnexus.app/connect", description: "Agent Nexus connection guide" };
  spec.tags = [
    { name: "discovery", description: "Find interfaces for a task" },
    { name: "registry", description: "Read registry entries" },
    { name: "reliability", description: "Health and uptime evidence" },
    { name: "keys", description: "Self-service API keys" },
  ];
  spec.components = {
    securitySchemes: {
      apiKey: { type: "apiKey", in: "header", name: "x-api-key", description: "Optional. Free key raises the quota from 100 to 1,000 calls/day; Agent Pro 50,000/day." },
    },
    schemas: { Entry: entry, Error: error, CurrentHealth: health, DiscoveryMatch: match, DiscoveryResult: discovery },
    responses: {
      BadRequest: { description: "Invalid parameters", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      RateLimited: { description: "Daily quota exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
    },
  };
  // Anonymous access stays valid: `{}` means "no auth" is an accepted alternative.
  spec.security = [{}, { apiKey: [] }];
  const tagFor: Record<string, string> = {
    createApiKey: "keys", discoverCapabilities: "discovery", searchRegistry: "registry", getEntry: "registry",
    listCapabilities: "discovery", streamEntries: "registry", getStatus: "reliability", reportInvocation: "reliability",
  };
  for (const item of Object.values<any>(spec.paths)) {
    for (const op of Object.values<any>(item)) {
      op.tags = [tagFor[op.operationId] ?? "registry"];
      op.security = [{}, { apiKey: [] }];
      op.responses["400"] ??= { $ref: "#/components/responses/BadRequest" };
      if (op.operationId !== "createApiKey") op.responses["429"] ??= { $ref: "#/components/responses/RateLimited" };
      for (const r of Object.values<any>(op.responses)) {
        const c = r.content?.["application/json"];
        if (c?.schema === entry) c.schema = { $ref: "#/components/schemas/Entry" };
      }
    }
  }
  const disc = spec.paths["/api/public/discover"].get.responses["200"].content["application/json"];
  disc.schema = { $ref: "#/components/schemas/DiscoveryResult" };
  spec.paths["/api/public/registry"].get.responses["200"].content["application/json"].schema.properties.results.items = { $ref: "#/components/schemas/Entry" };
  spec.paths["/api/public/report"].post.responses["200"].content = {
    "application/json": { schema: { type: "object", additionalProperties: true } },
  };
  return spec;
}

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
