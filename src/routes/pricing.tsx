import { createFileRoute, Link } from "@tanstack/react-router";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { SubscribeButton } from "@/components/subscribe-button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Agent Nexus" },
      {
        name: "description",
        content:
          "Free discovery for agents, paid verification and reliability data for the teams publishing the interfaces agents call.",
      },
      { property: "og:title", content: "Pricing — Agent Nexus" },
      {
        property: "og:description",
        content:
          "Discovery stays free for agents. Publishers pay for verification, uptime monitoring and placement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    audience: "Trying it out",
    price: "$0",
    line: "Enough to prototype an agent and see if the registry helps.",
    points: [
      "100 calls a day with no account",
      "1,000 calls a day with a free key",
      "Search, capability discovery, MCP server",
      "Last 7 days of uptime per interface",
      "Submit and vote as a member",
    ],
    cta: { label: "Get a free key", to: "/keys" as const },
  },
  {
    name: "Agent Pro",
    audience: "You build agents",
    price: "$29/mo",
    line: "For a product whose agents query the registry all day.",
    points: [
      "50,000 calls a day — 50x the free key",
      "Full uptime + latency history, not 7 days",
      "Pick interfaces on reliability, not guesswork",
      "Bulk catalog feed and capability index",
      "Your agent stops breaking on quota limits",
    ],
    cta: { label: "Get a free key", to: "/keys" as const },
    priceId: "agent_pro_monthly",
    highlight: true,
  },
  {
    name: "Publisher",
    audience: "You ship an interface",
    price: "$49/mo",
    line: "For the team behind an API, MCP server or CLI.",
    points: [
      "Verified badge earned by a real call test",
      "Monitored every 6 hours, alerted on downtime",
      "Ranked higher in what agents get served",
      "You own and edit your entry's contract",
      "A distribution channel, not an ad",
    ],
    cta: { label: "Submit an interface", to: "/submit" as const },
    priceId: "publisher_monthly",
  },
];


function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-[11px] tracking-[0.28em] uppercase">
            Agent Nexus
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/explore" className="transition-colors hover:text-foreground">
              Explore
            </Link>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">
          Pricing
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight">
          Agents read for free. Humans pay to go further.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Nothing here is billed to an agent — agents have no wallet. Two kinds of
          people subscribe: developers whose agents call the registry at volume, and
          teams who want their own API, MCP server or CLI verified, monitored and
          served to those agents.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <section
              key={plan.name}
              className={`rounded-2xl border p-5 ${
                plan.highlight ? "border-primary/40 bg-primary/[0.04]" : "border-border"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                {plan.audience}
              </p>
              <p className="mt-2 text-base font-medium tracking-tight">{plan.name}</p>
              <p className="mt-1 text-2xl font-medium tracking-tight">{plan.price}</p>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {plan.line}
              </p>
              <ul className="mt-5 space-y-2 text-xs leading-relaxed text-muted-foreground">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="text-primary">·</span>
                    {point}
                  </li>
                ))}
              </ul>
              {"priceId" in plan && plan.priceId ? (
                <SubscribeButton priceId={plan.priceId} label="Subscribe" />
              ) : (
                <Link
                  to={plan.cta.to}
                  className="mt-6 inline-block font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-70"
                >
                  {plan.cta.label} →
                </Link>
              )}
            </section>
          ))}
        </div>

        <section className="mt-16 border-t border-border/60 pt-8">
          <h2 className="font-mono text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
            What you get that free does not give
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">Headroom.</span> A free key stops at
              1,000 calls a day. An agent looping over a task burns that in an
              afternoon and starts failing. Agent Pro gives 50,000 a day.
            </p>
            <p>
              <span className="text-foreground">Reliability history.</span> Free shows
              the last 7 days. Pro shows the full record — every probe, latency and
              incident — so you route to the interface that actually stays up.
            </p>
            <p>
              <span className="text-foreground">Being found.</span> Publishers get a
              verified badge earned by a real call test, monitoring every 6 hours,
              downtime alerts, and higher placement in what agents get served. Agents
              do not read marketing pages; they read this registry.
            </p>
            <p>
              <span className="text-foreground">Nothing an agent has to buy.</span>{" "}
              Discovery stays free for machines forever. That is what keeps the demand
              flowing, and what makes a Publisher entry worth paying for.
            </p>
          </div>
        </section>


        <p className="mt-12 font-mono text-[11px] text-muted-foreground/60">
          Checkout is live. Payments, invoices and tax are handled by our reseller Paddle, the Merchant of Record.
        </p>
      </main>
    </div>
  );
}
