import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "./terms";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — Agent Nexus" },
      {
        name: "description",
        content:
          "What personal data Agent Nexus collects, why, who it is shared with, how long it is kept, and the rights you have over it.",
      },
      { property: "og:title", content: "Privacy Notice — Agent Nexus" },
      {
        property: "og:description",
        content: "How BrainPath.io handles personal data for Agent Nexus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://agentnexus.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://agentnexus.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Notice" updated="16 September 2026">
      <h2>1. Who we are</h2>
      <p>
        Agent Nexus is operated by <strong>BrainPath.io</strong>. For the personal data described
        here, BrainPath.io acts as the <strong>data controller</strong>: we decide what data is
        collected and why. Contact:{" "}
        <a href="mailto:support@agentnexus.app">support@agentnexus.app</a>.
      </p>

      <h2>2. What we collect and why</h2>
      <ul>
        <li>
          <strong>Account data</strong> — email address, login credentials (stored hashed),
          display name, role. Used to create and secure your account and provide the Service.
          Legal basis: performance of a contract.
        </li>
        <li>
          <strong>API keys and usage counters</strong> — key prefix, hashed key, per-day call
          counts, last-used timestamp. Used to enforce quotas and prevent abuse. Legal basis:
          contract and legitimate interests.
        </li>
        <li>
          <strong>Access logs</strong> — which machine endpoint was called, timestamp, a hashed
          (non-reversible) form of the caller's IP address, user-agent string and country. Used for
          security, abuse prevention and aggregate product analytics. We do not store IP addresses
          in clear text. Legal basis: legitimate interests.
        </li>
        <li>
          <strong>Content you submit</strong> — registry entries, votes, incident reports. Used to
          operate and moderate the public registry. Legal basis: contract.
        </li>
        <li>
          <strong>Support messages</strong> — the content of emails you send us. Used to answer
          you. Legal basis: legitimate interests.
        </li>
        <li>
          <strong>Subscription records</strong> — plan, status and subscription identifier
          received from Paddle. Used to unlock paid features. Legal basis: contract. Card and
          payment details are collected and held by Paddle, never by us.
        </li>
      </ul>

      <h2>3. Who we share data with</h2>
      <ul>
        <li>
          <strong>Merchant of Record</strong> — Paddle.com, for the sale of our subscriptions,
          subscription management, payments, invoicing and tax compliance.
        </li>
        <li>
          <strong>Service providers / subprocessors</strong> — our hosting, database and
          authentication providers, and the email provider used for account messages. They process
          data only on our instructions.
        </li>
        <li>
          <strong>Professional advisers</strong> — legal and accounting advisers where necessary.
        </li>
        <li>
          <strong>Authorities</strong> — where we are required to disclose by law.
        </li>
      </ul>
      <p>We do not sell personal data and do not use it to train AI models.</p>

      <h2>4. International transfers</h2>
      <p>
        Our providers may process data outside the UK/EEA. Where that happens we rely on
        appropriate safeguards, such as European Commission adequacy decisions or Standard
        Contractual Clauses.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        Account data is kept while your account is active and for up to 12 months afterwards.
        Access logs are retained for 60 days and then deleted automatically. API usage counters are
        pruned after 7 days. Billing records are kept as long as tax law requires. Data is deleted
        or anonymised once no longer needed.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Subject to applicable law, you may request access to your data, correction of inaccurate
        data, erasure, restriction of processing, portability, and you may object to processing
        based on legitimate interests or withdraw consent where consent was the basis. Email{" "}
         <a href="mailto:support@agentnexus.app">support@agentnexus.app</a> and we will respond
        within one month. If you are in the UK or EEA you also have the right to complain to your
        data protection supervisory authority.
      </p>

      <h2>7. Security</h2>
      <p>
        We apply appropriate technical and organisational measures: encryption in transit,
        row-level access controls in the database, hashed credentials and API keys, hashed IP
        identifiers, and least-privilege access for administrators.
      </p>

      <h2>8. Cookies and local storage</h2>
      <p>
        We use only <strong>essential</strong> cookies and browser storage — those needed to keep
        you signed in and to run the checkout overlay. We do not use advertising or cross-site
        tracking cookies. You can clear this storage in your browser at any time, though doing so
        will sign you out.
      </p>

      <h2>9. Changes</h2>
      <p>
        We will post updates to this notice on this page with a new “last updated” date, and will
        tell you about material changes affecting your rights.
      </p>
    </LegalLayout>
  );
}
