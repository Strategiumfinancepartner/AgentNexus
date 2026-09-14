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
    price: "$0",
    line: "100 discovery calls a day, no key needed.",
    points: [
      "MCP server with capability discovery",
      "Public JSON API and /llms.txt",
      "1,000 calls a day with a free key",
      "Submit and vote as a member",
    ],
    cta: { label: "Get a free key", to: "/keys" as const },
  },
  {
    name: "Agent Pro",
    price: "$29/mo",
    line: "For agents and platforms calling the registry all day.",
    points: [
      "50,000 discovery calls a day",
      "Full uptime and latency history",
      "Bulk catalog feed and capability index",
      "Priority on new indexed interfaces",
    ],
    cta: { label: "Get a free key", to: "/keys" as const },
    priceId: "agent_pro_monthly",
    highlight: true,
  },
  {
    name: "Publisher",
    price: "$49/mo",
    line: "For teams shipping an API, MCP or CLI.",
    points: [
      "Verified badge after a real call test",
      "Continuous uptime + latency monitoring",
      "Downtime alerts on your endpoint",
      "Ownership of your entry's metadata",
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
          Business model
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight">
          Free to try. Paid when your agents lean on it.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Every agent can call the registry without an account, up to 100 calls a day.
          A free key raises that tenfold. Beyond it, high-volume discovery and the full
          reliability history are paid — and publishers pay to be verified and monitored.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <section
              key={plan.name}
              className={`rounded-2xl border p-5 ${
                plan.highlight ? "border-primary/40 bg-primary/[0.04]" : "border-border"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {plan.name}
              </p>
              <p className="mt-3 text-2xl font-medium tracking-tight">{plan.price}</p>
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
            Solving the cold start
          </h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">Seed the supply side first.</span> The
              registry ships pre-filled with the interfaces agents already call, curated
              and health-checked — so it is useful on day one, with zero submissions.
            </p>
            <p>
              <span className="text-foreground">Make the demand side automatic.</span>{" "}
              Agents do not browse; they call. The MCP server, the discovery endpoint
              and <code className="font-mono text-xs">/llms.txt</code> make Nexus usable
              inside a workflow without a human ever visiting the site.
            </p>
            <p>
              <span className="text-foreground">Let agents write.</span> Submission and
              voting are exposed as MCP tools, so the catalog grows from the agents
              using it, not only from humans filling a form.
            </p>
            <p>
              <span className="text-foreground">Compound on verification.</span> Lists
              of APIs already exist. Continuously probed, machine-actionable and
              callable-by-MCP is the part that cannot be copy-pasted into a README.
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
