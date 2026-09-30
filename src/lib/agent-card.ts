/** Shared A2A agent card payload, served on both well-known paths. */
export function agentCard(origin: string) {
  return {
    protocolVersion: "1.0",
    name: "Agent Nexus (agentnexus.app)",
    description:
      "Resolves a capability need into a callable interface: HTTP APIs, MCP servers and CLIs, each with a machine contract and live reliability data.",
    // A2A JSON-RPC 2.0 endpoint: `message/send` (v0.x) and `SendMessage` (v1.0).
    url: `${origin}/api/public/a2a`,
    version: "1.0.0",
    provider: {
      organization: "Agent Nexus (agentnexus.app)",
      legalEntity: "BrainPath.io",
      legalName: "BrainPath.io",
      url: "https://agentnexus.app",
      domain: "agentnexus.app",
      contact: "mailto:support@agentnexus.app",
      email: "support@agentnexus.app",
    },
    contact: "mailto:support@agentnexus.app",
    contactEmail: "support@agentnexus.app",
    documentationUrl: `${origin}/connect`,
    privacyPolicyUrl: `${origin}/privacy`,
    termsOfServiceUrl: `${origin}/terms`,
    preferredTransport: "JSONRPC",
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["application/json"],
    // Discovery is deliberately open (anonymous quota applies). The schemes below
    // are optional: they raise the daily quota, they do not gate the endpoint —
    // hence the empty `security` requirement list.
    securitySchemes: {
      oauth2: {
        type: "oauth2",
        description:
          "Optional. OAuth 2.1 with PKCE (S256) for member and Agent Pro quotas. Metadata: /.well-known/oauth-authorization-server",
        flows: {
          authorizationCode: {
            authorizationUrl:
              "https://upjqzuruxbvgdrheacnz.supabase.co/auth/v1/authorize",
            tokenUrl: "https://upjqzuruxbvgdrheacnz.supabase.co/auth/v1/token",
            refreshUrl: "https://upjqzuruxbvgdrheacnz.supabase.co/auth/v1/token",
            scopes: {
              openid: "Identify the calling member",
              email: "Member email, used for moderation notices",
              profile: "Member profile",
            },
          },
        },
      },
      agentKey: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description:
          "Optional free agent key, self-issued with POST /api/public/keys. Raises the daily quota from 100 to 1000 calls and unlocks machine submissions.",
      },
    },
    // Explicitly public: no scheme is required to call this agent.
    security: [],
    securityRequirements: [],
    skills: [
      {
        id: "discover_capabilities",
        name: "Discover a callable interface",
        description:
          "Given a natural-language need, return ranked APIs, MCP servers and CLIs with endpoint, auth mode, formats, limits, pricing and reliability score.",
        tags: ["discovery", "tools", "registry"],
        examples: [
          "send a transactional email",
          "query a postgres database from an agent",
          "transcode a video to mp4",
        ],
        inputModes: ["text/plain"],
        outputModes: ["application/json"],
      },
      {
        id: "get_entry",
        name: "Read an interface contract",
        description: "Full machine contract for one registry entry by slug.",
        tags: ["registry", "contract"],
        examples: ["get the contract for resend-api"],
      },
      {
        id: "report_invocation",
        name: "Report an invocation outcome",
        description:
          "Feed back success, failure, auth error, rate limit or timeout after calling an interface.",
        tags: ["telemetry", "reliability"],
        examples: ["report that stripe-api returned 200 in 210ms"],
      },
    ],
    // A2A v1.0 declares the protocol version per interface (§3.6, Major.Minor).
    supportedInterfaces: [
      {
        transport: "JSONRPC",
        url: `${origin}/api/public/a2a`,
        protocolVersion: "1.0",
      },
      {
        transport: "HTTP+JSON",
        url: `${origin}/api/public/discover`,
        protocolVersion: "1.0",
      },
    ],
    additionalInterfaces: [
      { transport: "JSONRPC", url: `${origin}/api/public/mcp` },
      { transport: "MCP+HTTP", url: `${origin}/mcp` },
      { transport: "OpenAPI", url: `${origin}/openapi.json` },
      { transport: "TEXT", url: `${origin}/llms.txt` },
      { transport: "NDJSON", url: `${origin}/api/public/entries.ndjson` },
    ],
  };
}
