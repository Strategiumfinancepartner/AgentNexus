/** Shared A2A agent card payload, served on both well-known paths. */
export function agentCard(origin: string) {
  return {
    protocolVersion: "0.3.0",
    name: "Agent Nexus",
    description:
      "Resolves a capability need into a callable interface: HTTP APIs, MCP servers and CLIs, each with a machine contract and live reliability data.",
    url: `${origin}/api/public/discover`,
    version: "0.4.0",
    provider: { organization: "Agent Nexus", url: origin },
    documentationUrl: `${origin}/connect`,
    preferredTransport: "HTTP+JSON",
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["application/json"],
    securitySchemes: {},
    security: [],
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
    additionalInterfaces: [
      { transport: "MCP+HTTP", url: `${origin}/mcp` },
      { transport: "OpenAPI", url: `${origin}/openapi.json` },
      { transport: "TEXT", url: `${origin}/llms.txt` },
      { transport: "NDJSON", url: `${origin}/api/public/entries.ndjson` },
    ],
  };
}
