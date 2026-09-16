import { createFileRoute } from "@tanstack/react-router";

/**
 * /.well-known/oauth-authorization-server — RFC 8414 authorization server
 * metadata. Our MCP server advertises this issuer in
 * /.well-known/oauth-protected-resource; this document describes its
 * OAuth 2.1 endpoints so discovery-only clients don't 404.
 */
export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
  server: {
    handlers: {
      GET: async () => {
        const issuer = "https://upjqzuruxbvgdrheacnz.supabase.co/auth/v1";
        return new Response(
          JSON.stringify(
            {
              issuer,
              authorization_endpoint: `${issuer}/authorize`,
              token_endpoint: `${issuer}/token`,
              scopes_supported: ["openid", "email", "profile"],
              response_types_supported: ["code"],
              response_modes_supported: ["query"],
              grant_types_supported: ["authorization_code", "refresh_token"],
              code_challenge_methods_supported: ["S256"],
              token_endpoint_auth_methods_supported: ["none"],
              service_documentation: "https://agentnexus.app/connect",
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
