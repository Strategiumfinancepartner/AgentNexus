import { createFileRoute } from "@tanstack/react-router";

// OpenAI Apps (ChatGPT plugin directory) domain-ownership token. Keep published: OpenAI may re-verify.
const TOKEN = "1O3CfHbc4RaeBEwQJSg2n5qmlKoQVgqQgKD05gI3wEI";

export const Route = createFileRoute("/.well-known/openai-apps-challenge")({
  server: {
    handlers: {
      GET: async () =>
        new Response(TOKEN, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
