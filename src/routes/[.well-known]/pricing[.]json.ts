import { createFileRoute } from "@tanstack/react-router";

const PRICING = {
  provider: "BrainPath.io",
  product: "Agent Nexus",
  url: "https://agentnexus.app/pricing",
  currency: "USD",
  summary:
    "Agents read for free. Humans pay to go further: higher quotas for agent builders, verification and monitoring for publishers.",
  tiers: [
    {
      id: "anonymous",
      name: "Anonymous",
      price_monthly: 0,
      quota: "100 calls/day",
      description:
        "No account, no key. Read the public registry, manifests and MCP endpoint directly.",
    },
    {
      id: "free",
      name: "Free",
      price_monthly: 0,
      quota: "1,000 calls/day",
      description:
        "Self-serve API key via POST https://agentnexus.app/api/public/keys — no human approval.",
    },
    {
      id: "agent-pro",
      name: "Agent Pro",
      price_monthly: 29,
      quota: "50,000 calls/day",
      description:
        "For teams building agents on top of the registry: higher quota plus full reliability history.",
      subscribe: "https://agentnexus.app/pricing",
    },
    {
      id: "publisher",
      name: "Publisher",
      price_monthly: 49,
      description:
        "For API/MCP/CLI publishers: verified badge after a live call test, continuous monitoring, alerts, and entry control.",
      subscribe: "https://agentnexus.app/pricing",
    },
  ],
  payments: {
    merchant_of_record: "Paddle",
    refunds: "30-day money-back guarantee — https://agentnexus.app/refunds",
  },
};

export const Route = createFileRoute("/.well-known/pricing.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(PRICING, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        }),
    },
  },
});
