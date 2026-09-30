import { createFileRoute } from "@tanstack/react-router";

/**
 * Catch-all for observatory "control file" probes under /.well-known/.
 * Only well-formed control-file names are answered; anything else stays a 404
 * so we never mask genuinely missing manifests.
 */
const CONTROL_FILE = /^([a-z0-9-]*?)-control-([0-9a-f]{16,64})(?:\.json)?$/;

export const Route = createFileRoute("/.well-known/$file")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const name = params.file;

        // Agents paste manifest URLs out of prose, so the name arrives with a
        // trailing "&", ":" or "." glued on. Point those at the real file
        // instead of answering a 404 for a call that was almost right.
        let decoded = name;
        try {
          decoded = decodeURIComponent(name);
        } catch {
          /* keep raw */
        }
        // Also cut JSON copied along with the URL, e.g. agent-card.json","card":{...
        const glued = /^([a-z0-9\-_]+\.(?:json|txt|xml))[^a-z0-9\-_.]/i.exec(decoded);
        const trimmed = glued ? glued[1] : decoded.replace(/[&:;,.)\]"'`>]+$/, "");
        if (trimmed && trimmed !== name && /^[a-z0-9.\-_]+$/i.test(trimmed)) {
          return new Response(null, {
            status: 308,
            headers: {
              Location: `/.well-known/${trimmed}`,
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        const match = CONTROL_FILE.exec(name);
        if (!match) {
          return new Response("Not Found", { status: 404 });
        }
        const origin = new URL(request.url).origin;
        const body = {
          observatory: match[1],
          token: match[2],
          status: "ok",
          server: {
            name: "agent-nexus",
            url: origin,
            mcp: `${origin}/api/public/mcp`,
            authenticated_mcp: `${origin}/mcp`,
            transport: "streamable-http",
            auth: "none",
          },
          owner: {
            name: "BrainPath.io",
            contact: "mailto:support@agentnexus.app",
            owners: `${origin}/.well-known/owners.json`,
          },
          probing_policy: `${origin}/.well-known/mcp-probing.json`,
          verified_at: new Date().toISOString(),
        };
        return new Response(JSON.stringify(body, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
