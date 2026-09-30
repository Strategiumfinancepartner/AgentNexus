import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface SubmissionDecisionProps {
  entryName: string
  slug: string
  decision: 'approved' | 'rejected' | string
  note?: string
  entryUrl: string
}

export function SubmissionDecision({
  entryName,
  slug,
  decision,
  note,
  entryUrl,
}: SubmissionDecisionProps) {
  const approved = decision === 'approved'
  return (
    <Html>
      <Head />
      <Preview>{`${entryName} was ${approved ? 'approved' : 'not approved'} on Agent Nexus`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>AGENT NEXUS</Text>
          <Heading style={heading}>
            {approved ? 'Your listing is live' : 'Your submission was not approved'}
          </Heading>

          {approved ? (
            <Text style={text}>
              <strong>{entryName}</strong> passed review and is now discoverable by agents through
              the registry — the MCP endpoint, the discovery API, the bulk export and the public
              page.
            </Text>
          ) : (
            <Text style={text}>
              <strong>{entryName}</strong> was reviewed and not added to the registry. You are
              welcome to fix the points below and submit again.
            </Text>
          )}

          <Section style={card}>
            <Text style={row}>
              <span style={label}>Listing</span> {slug}
            </Text>
            <Text style={row}>
              <span style={label}>Decision</span> {approved ? 'approved' : 'rejected'}
            </Text>
            {note ? (
              <Text style={row}>
                <span style={label}>Note</span> {note}
              </Text>
            ) : null}
          </Section>

          {approved ? (
            <Text style={text}>
              Your page:{' '}
              <Link href={entryUrl} style={link}>
                {entryUrl}
              </Link>
              <br />
              We keep probing your endpoint automatically. If it starts failing, the listing shows
              it — the Publisher plan adds a verified badge, tighter monitoring and better ranking:{' '}
              <Link href="https://agentnexus.app/pricing" style={link}>
                agentnexus.app/pricing
              </Link>
            </Text>
          ) : (
            <Text style={text}>
              Submission guide:{' '}
              <Link href="https://agentnexus.app/llms.txt" style={link}>
                agentnexus.app/llms.txt
              </Link>
            </Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Agent Nexus — agentnexus.app. Questions? Reply to this email or write to{' '}
            <Link href="mailto:support@agentnexus.app" style={link}>
              support@agentnexus.app
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#0b0b0c',
  fontFamily:
    "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '32px 0',
}
const container: React.CSSProperties = {
  backgroundColor: '#111113',
  border: '1px solid #26262a',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '32px',
}
const brand: React.CSSProperties = {
  color: '#facc15',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '11px',
  letterSpacing: '0.2em',
  margin: '0 0 20px',
}
const heading: React.CSSProperties = {
  color: '#fafafa',
  fontSize: '22px',
  fontWeight: 600,
  margin: '0 0 16px',
}
const text: React.CSSProperties = {
  color: '#c8c8cd',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
}
const card: React.CSSProperties = {
  backgroundColor: '#17171a',
  border: '1px solid #26262a',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 20px',
}
const row: React.CSSProperties = {
  color: '#e4e4e7',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: '12px',
  margin: '0 0 8px',
  wordBreak: 'break-all',
}
const label: React.CSSProperties = {
  color: '#8b8b93',
  display: 'inline-block',
  minWidth: '80px',
}
const link: React.CSSProperties = { color: '#facc15', textDecoration: 'underline' }
const hr: React.CSSProperties = { borderColor: '#26262a', margin: '24px 0 16px' }
const footer: React.CSSProperties = {
  color: '#77777f',
  fontSize: '12px',
  lineHeight: '18px',
  margin: 0,
}

export const template: TemplateEntry = {
  component: SubmissionDecision,
  subject: (data) =>
    data['decision'] === 'approved'
      ? `${data['entryName'] ?? 'Your listing'} is live on Agent Nexus`
      : `${data['entryName'] ?? 'Your submission'} was not approved on Agent Nexus`,
  displayName: 'Submission decision',
  previewData: {
    entryName: 'Resend API',
    slug: 'resend-api',
    decision: 'approved',
    note: '',
    entryUrl: 'https://agentnexus.app/entry/resend-api',
  } satisfies SubmissionDecisionProps as unknown as Record<string, any>,
}
