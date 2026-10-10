import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/best-email-apis")({
  head: () => ({
    meta: [
      {
        title: "Best email APIs for agents, tested live — Agent Nexus (agentnexus.app)",
      },
      {
        name: "description",
        content:
          "A curated shortlist of email APIs for AI agents — sending, validation, disposable inboxes and deliverability — each one probed live by Agent Nexus before being listed, with latency and auth requirements.",
      },
      {
        property: "og:title",
        content: "Best email APIs for agents, tested live — Agent Nexus",
      },
      {
        property: "og:description",
        content:
          "Sending, validation, disposable inboxes and spam testing: every email API on this list answers a real probe before it is listed.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/best-email-apis" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/best-email-apis" }],
  }),
  component: BestEmailApis,
});

type Pick = { slug: string; name: string; why: string; auth: string };

const GROUPS: { title: string; note: string; picks: Pick[] }[] = [
  {
    title: "Sending transactional email",
    note: "When the agent needs to actually deliver a message to a real inbox.",
    picks: [
      {
        slug: "brevo-api",
        name: "Brevo",
        why: "Transactional and marketing email with a generous free tier; answers our probe in ~34ms.",
        auth: "API key",
      },
      {
        slug: "mailersend-api",
        name: "MailerSend",
        why: "Clean REST contract, templates included, predictable responses.",
        auth: "Bearer token",
      },
      {
        slug: "mailgun-api",
        name: "Mailgun",
        why: "Sending, routing, validation and inbound parsing in one API.",
        auth: "Basic auth",
      },
      {
        slug: "mailjet-api",
        name: "Mailjet",
        why: "Transactional and marketing; free tier of 200 emails/day.",
        auth: "API key",
      },
      {
        slug: "elasticemail-api",
        name: "Elastic Email",
        why: "Simple REST sending and contact lists; ~45ms probe latency.",
        auth: "API key header",
      },
      {
        slug: "courier-api",
        name: "Courier",
        why: "One send call routed to email, SMS, Slack or push per user preference.",
        auth: "Bearer token",
      },
      {
        slug: "loops-api",
        name: "Loops",
        why: "Transactional email plus lifecycle campaigns for SaaS.",
        auth: "Bearer key",
      },
    ],
  },
  {
    title: "Validating an address before sending",
    note: "Syntax, MX records, disposable detection — before burning sender reputation.",
    picks: [
      {
        slug: "abstract-email-validation-api",
        name: "Abstract Email Validation",
        why: "Deliverability, syntax and disposable status in one call.",
        auth: "API key",
      },
      {
        slug: "disify-api",
        name: "Disify",
        why: "Detects disposable and temporary addresses; open endpoint, no key.",
        auth: "None",
      },
      {
        slug: "kickbox-disposable-api",
        name: "Kickbox Disposable Check",
        why: "Answers one question — is this domain disposable — with no key required.",
        auth: "None",
      },
      {
        slug: "email-validator-by-lifestep-api",
        name: "Email Validator by LifeStep",
        why: "Syntax, MX, disposable and role detection, plus typo suggestions.",
        auth: "None",
      },
      {
        slug: "mailveri-email-verification-api-api",
        name: "MailVeri",
        why: "Real-time verification down to SMTP mailbox level; 1,000 free credits.",
        auth: "Bearer key",
      },
      {
        slug: "mailcheck-ai-api",
        name: "MailCheck.ai",
        why: "Blocks signups with temporary addresses; open endpoint.",
        auth: "None",
      },
      {
        slug: "haveibeenpwned-api",
        name: "Have I Been Pwned",
        why: "Checks whether an address appears in known breaches; ~14ms probe.",
        auth: "Key for some routes",
      },
    ],
  },
  {
    title: "Disposable inboxes for testing",
    note: "When the agent needs to receive mail — OTPs, signup confirmations — without a real mailbox.",
    picks: [
      {
        slug: "best-temp-mail-api",
        name: "Best Temp Mail",
        why: "Disposable inboxes with OTP extraction, built for automated testing.",
        auth: "None",
      },
      {
        slug: "mail-tm-api",
        name: "Mail.tm",
        why: "Create an address and read incoming mail over an API.",
        auth: "Per-inbox token",
      },
      {
        slug: "dropmail-api",
        name: "DropMail",
        why: "GraphQL API for ephemeral inboxes.",
        auth: "None",
      },
      {
        slug: "guerrilla-mail-api",
        name: "Guerrilla Mail",
        why: "The classic disposable address service, scriptable.",
        auth: "None",
      },
      {
        slug: "mail-gw-api",
        name: "mail.gw",
        why: "10-minute mail over a simple API.",
        auth: "None",
      },
      {
        slug: "mailtrap-api",
        name: "Mailtrap",
        why: "Safe sandbox: test sending without ever reaching a real inbox.",
        auth: "Bearer token",
      },
    ],
  },
  {
    title: "Deliverability and domain health",
    note: "Will the message land, and is the domain configured to be trusted?",
    picks: [
      {
        slug: "email-spam-tester-api",
        name: "Email Spam Tester",
        why: "Send a test message, get a spam score with 41 checks, RFC citations and a fix plan.",
        auth: "None",
      },
      {
        slug: "verifypulse-api",
        name: "VerifyPulse",
        why: "MX, SPF and DMARC inspection with a letter grade — the exact records, not just a score.",
        auth: "None",
      },
    ],
  },
];

function BestEmailApis() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-5 backdrop-blur-xl">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase"
          >
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus.APP
          </Link>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <Link to="/explore" className="transition-colors hover:text-foreground">
              Registry
            </Link>
            <Link to="/status" className="transition-colors hover:text-foreground">
              Status
            </Link>
            <Link to="/connect" className="transition-colors hover:text-foreground">
              Connect
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-24">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            The best email APIs for agents — each one tested live
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Every service below is in the Agent Nexus registry, which means it answered a real
            probe before being listed — not a README claim. We re-probe them continuously; current
            health and latency are on each entry's page.
          </p>

          {GROUPS.map((group) => (
            <section key={group.title} className="mt-14">
              <h2 className="text-xl font-medium tracking-tight">{group.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{group.note}</p>
              <ul className="mt-5 divide-y divide-border/60 border-t border-border/60">
                {group.picks.map((pick) => (
                  <li key={pick.slug} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <Link
                        to="/registry/$slug"
                        params={{ slug: pick.slug }}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {pick.name}
                      </Link>
                      <span className="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                        {pick.auth}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{pick.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="mt-16 rounded-xl border border-border/60 p-5">
            <p className="text-sm text-muted-foreground">
              This shortlist is maintained by hand from the{" "}
              <Link to="/explore" className="text-foreground underline underline-offset-4">
                full registry
              </Link>{" "}
              — 700+ interfaces, each with live health, latency and an agent-readable contract.
              Agents can read the same list machine-first at{" "}
              <a
                href="/entries.ndjson"
                className="text-foreground underline underline-offset-4"
              >
                /entries.ndjson
              </a>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
