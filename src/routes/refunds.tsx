import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "./terms";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Agent Nexus" },
      {
        name: "description",
        content:
          "30-day money-back guarantee on Agent Nexus subscriptions. How to request a refund through Paddle, our Merchant of Record.",
      },
      { property: "og:title", content: "Refund Policy — Agent Nexus" },
      {
        property: "og:description",
        content: "30-day money-back guarantee on Agent Nexus subscriptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <LegalLayout title="Refund Policy" updated="16 September 2026">
      <p>
        Agent Nexus is operated by <strong>BrainPath.io</strong>. We want you to be able to try a
        paid plan without risk, so we offer a <strong>30-day money-back guarantee</strong> on
        subscription purchases.
      </p>

      <h2>The guarantee</h2>
      <p>
        If you are not satisfied with your purchase, you can request a full refund within 30 days
        of your order date — no explanation required. This applies to your first payment on Agent
        Pro and Publisher plans.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Refunds are processed by our payment provider and Merchant of Record, Paddle. To request
        one, visit{" "}
        <a href="https://paddle.net" target="_blank" rel="noreferrer">
          paddle.net
        </a>{" "}
        with the email address you used at checkout, or email us at{" "}
        <a href="mailto:support@agentnexus.app">support@agentnexus.app</a> and we will arrange it
        with Paddle on your behalf. Refunds are returned to the original payment method, typically
        within 5–10 business days depending on your bank.
      </p>

      <h2>Renewals and cancellation</h2>
      <p>
        Subscriptions renew automatically each month. You can cancel at any time through the
        billing portal linked from your Paddle receipt; cancellation stops future charges and your
        paid features remain active until the end of the period already paid for. If a renewal
        charge was unexpected, contact us — we handle those case by case and will normally refund a
        renewal that went unused.
      </p>

      <h2>Beyond 30 days</h2>
      <p>
        After the 30-day window we may still issue a refund at our discretion, for example where
        the Service was unavailable for a prolonged period or where you were charged in error.
      </p>

      <h2>Statutory rights</h2>
      <p>
        This policy is in addition to any rights you have under applicable consumer law, including
        withdrawal rights for consumers in the EU and UK. Paddle's own{" "}
        <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noreferrer">
          refund policy
        </a>{" "}
        also applies to all orders.
      </p>
    </LegalLayout>
  );
}
