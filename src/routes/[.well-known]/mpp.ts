import { createFileRoute } from "@tanstack/react-router";

/** Machine Payable Protocol probe: declares that reads are free and where paid tiers live. */
export const Route = createFileRoute("/.well-known/mpp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = {
          mpp: {
            version: "0.1",
            provider: "BrainPath.io",
            product: "Agent Nexus",
            free_access: {
              anonymous: "100 calls/day",
              self_service_key: `${origin}/api/public/keys`,
            },
            paid_tiers: `${origin}/.well-known/pricing.json`,
            payment_methods: ["card"],
            merchant_of_record: "Paddle",
            currency: "USD",
            checkout: `${origin}/pricing`,
            x402: `${origin}/.well-known/x402`,
            contact: "mailto:support@agentnexus.app",
          },
        };
        return new Response(JSON.stringify(body, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
