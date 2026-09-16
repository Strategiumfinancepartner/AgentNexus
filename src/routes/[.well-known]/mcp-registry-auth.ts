import { createFileRoute } from "@tanstack/react-router";

/**
 * Domain ownership proof for the official MCP registry (HTTP auth method).
 * The matching private key is stored as the MCP_REGISTRY_PRIVATE_KEY secret and
 * only used by the mcp-publisher CLI at publish time.
 */
const PROOF = "v=MCPv1; k=ed25519; p=zVaAO3syqfejfkLQ6y4uUK3DfkuDQDqU5RDlgTwcRP4=\n";

export const Route = createFileRoute("/.well-known/mcp-registry-auth")({
  server: {
    handlers: {
      GET: async () =>
        new Response(PROOF, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        }),
    },
  },
});
