import { createFileRoute } from "@tanstack/react-router";

/**
 * RFC 9116 security.txt — lets security researchers report vulnerabilities.
 */
const SECURITY_TXT = `Contact: mailto:support@agentnexus.app
Contact: https://agentnexus.app/terms
Expires: 2027-03-16T00:00:00.000Z
Preferred-Languages: en, fr
Canonical: https://agentnexus.app/.well-known/security.txt
Policy: https://agentnexus.app/privacy
`;

export const Route = createFileRoute("/.well-known/security.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SECURITY_TXT, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
