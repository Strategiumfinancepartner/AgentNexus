import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Agent Nexus" },
      {
        name: "description",
        content:
          "The terms governing use of Agent Nexus, the registry of APIs, MCP servers and CLIs that AI agents call, operated by BrainPath.io.",
      },
      { property: "og:title", content: "Terms & Conditions — Agent Nexus" },
      {
        property: "og:description",
        content: "Terms of service for Agent Nexus, operated by BrainPath.io.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" updated="16 September 2026">
      <h2>1. Who you are contracting with</h2>
      <p>
        Agent Nexus (the “Service”) is operated by <strong>BrainPath.io</strong> (“we”, “us”,
        “our”). By creating an account, calling our public APIs or MCP endpoints, or otherwise
        using the Service, you enter into an agreement with BrainPath.io.
      </p>

      <h2>2. Acceptance of these terms</h2>
      <p>
        By continuing to use the Service you agree to these terms. If you use the Service on
        behalf of an organisation, you confirm you have authority to bind that organisation. If
        you use it as an individual, you confirm you are of legal age in your jurisdiction.
      </p>

      <h2>3. What the Service provides</h2>
      <p>
        Agent Nexus is a registry and discovery layer: it indexes third-party APIs, MCP servers
        and CLIs, records health and reliability data, and serves that catalogue to software
        agents and their developers. We do not operate the third-party interfaces we index and we
        are not responsible for them. Any call you make to a listed interface is between you and
        its provider, under that provider's own terms.
      </p>

      <h2>4. Accounts, keys and accurate information</h2>
      <p>
        You are responsible for keeping your credentials and API keys confidential and for all
        activity carried out with them. You must provide accurate information and keep it up to
        date. Keys are personal to your account or agent and must not be resold or shared.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You must not misuse the Service. In particular, you must not:</p>
      <ul>
        <li>use it for unlawful purposes, fraud, spam or deceptive activity;</li>
        <li>infringe the intellectual property or privacy rights of others;</li>
        <li>
          interfere with security or availability — no malware, probing, penetration attempts,
          denial-of-service, credential stuffing or unauthorised scraping;
        </li>
        <li>circumvent quotas, rate limits or other technical restrictions;</li>
        <li>reverse engineer, resell or redistribute the Service or its data feeds;</li>
        <li>
          submit registry entries that are misleading, that you have no right to publish, or that
          point to endpoints designed to harm callers.
        </li>
      </ul>

      <h2>6. Licence and intellectual property</h2>
      <p>
        We grant you a limited, non-exclusive, non-transferable right to use the Service within
        the plan you have selected. We retain ownership of the Service and all intellectual
        property in it, including software, database structure, documentation and branding.
      </p>

      <h2>7. Content you submit</h2>
      <p>
        You keep ownership of content you submit (registry entries, descriptions, reports). You
        grant us a limited licence to host, process and display that content in order to operate
        the Service. Rights-holders who believe content infringes their rights may contact us and
        we will review and, where appropriate, remove it; repeat infringement leads to account
        termination. We may moderate, edit or remove submissions at our discretion.
      </p>

      <h2>8. Service level and accuracy</h2>
      <p>
        The Service is provided on an “as is” and “as available” basis. We do not guarantee
        uninterrupted or error-free performance. Health checks, uptime figures, latency data and
        reliability scores are automated measurements and may be incomplete or out of date; they
        are informational only and are not a warranty about any third-party interface. To the
        fullest extent permitted by law we disclaim all implied warranties, including
        merchantability and fitness for a particular purpose.
      </p>

      <h2>9. Payment and subscription terms</h2>
      <p>
        Paid plans are billed in advance on a recurring monthly basis and renew automatically
        until cancelled. Payment, billing, currency, tax, invoicing, cancellation and refund
        mechanics are handled by our reseller Paddle and are governed by the{" "}
        <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">
          Paddle Checkout Buyer Terms
        </a>
        . See also our <Link to="/refunds">Refund Policy</Link>.
      </p>

      <h2>10. Merchant of Record</h2>
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the
        Merchant of Record for all our orders. Paddle provides all customer service inquiries and
        handles returns.
      </p>

      <h2>11. Suspension and termination</h2>
      <p>
        We may suspend or terminate your access for material breach of these terms, non-payment,
        security or fraud risk, or repeated or serious policy violations. You may stop using the
        Service at any time and cancel a subscription through Paddle. On termination your access
        ends; you may request an export of your own submitted data within 30 days, after which it
        may be deleted or anonymised.
      </p>

      <h2>12. Liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental,
        special or consequential damages, including loss of profits, data, revenue or goodwill,
        or for losses arising from your use of a third-party interface listed in the registry. Our
        total aggregate liability is limited to the fees you paid us in the twelve months before
        the claim. Nothing in these terms excludes liability for fraud, death or personal injury
        caused by negligence, or any liability that cannot be excluded by law.
      </p>

      <h2>13. Indemnity</h2>
      <p>
        You will indemnify us against claims, damages and costs arising from content you submit,
        your unlawful use of the Service, or your breach of these terms.
      </p>

      <h2>14. Changes</h2>
      <p>
        We may update these terms to reflect changes to the Service or the law. Material changes
        will be announced on this page with a new “last updated” date. Continued use after the
        change means you accept the updated terms.
      </p>

      <h2>15. General</h2>
      <p>
        You may not assign your rights without our consent; we may assign ours as part of a merger
        or acquisition. Neither party is liable for delays caused by events beyond its reasonable
        control. These terms are governed by the laws of the jurisdiction in which BrainPath.io is
        established, and disputes are subject to the courts of that jurisdiction.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:support@agentnexus.app">support@agentnexus.app</a>.
        Billing questions are handled by Paddle at{" "}
        <a href="https://paddle.net" target="_blank" rel="noreferrer">
          paddle.net
        </a>
        .
      </p>
    </LegalLayout>
  );
}

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-[11px] tracking-[0.28em] uppercase">
            Agent Nexus
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link to="/explore" className="transition-colors hover:text-foreground">
              Explore
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <p className="font-mono text-[11px] tracking-[0.28em] uppercase text-primary">Legal</p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight">{title}</h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          BrainPath.io · last updated {updated}
        </p>
        <div className="mt-10 space-y-5 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:font-mono [&_h2]:text-[11px] [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-2">
          {children}
        </div>
        <nav className="mt-16 flex flex-wrap gap-5 border-t border-border/60 pt-8 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/refunds" className="hover:text-foreground">
            Refunds
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </main>
    </div>
  );
}
