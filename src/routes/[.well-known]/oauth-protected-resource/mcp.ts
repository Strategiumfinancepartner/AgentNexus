// route: /.well-known/oauth-protected-resource/mcp
// Same protected-resource metadata as the base path, served at the
// path-inserted location RFC 9728 clients probe when protecting /mcp.

import { createFileRoute } from "@tanstack/react-router";

import { createTanStackOAuthProtectedResourceMetadataHandler } from "@lovable.dev/mcp-js/stacks/tanstack";

import mcp from "../../../lib/mcp/index";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/mcp")({
  server: {
    handlers: {
      ANY: createTanStackOAuthProtectedResourceMetadataHandler(mcp, { resourcePath: "/mcp", metadataPath: "/.well-known/oauth-protected-resource/mcp", trustForwardedHost: true }),
    },
  },
});
