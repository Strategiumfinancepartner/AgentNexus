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

export interface SubmissionReceivedProps {
  entryName: string
  category: string
  endpoint: string
  entryUrl: string
}

export function SubmissionReceived({
  entryName,
  category,
  endpoint,
  entryUrl,
}: SubmissionReceivedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${entryName} is queued for review on Agent Nexus`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>AGENT NEXUS</Text>
          <Heading style={heading}>Submission received</Heading>
          <Text style={text}>
            Thanks for submitting <strong>{entryName}</strong> to the registry. A reviewer
            checks every surface before it becomes visible to agents.
          </Text>

          <Section style={card}>
            <Text style={row}>
              <span style={label}>Surface</span> {entryName}
            </Text>
            <Text style={row}>
              <span style={label}>Type</span> {category}
            </Text>
            <Text style={row}>
              <span style={label}>Endpoint</span> {endpoint}
            </Text>
          </Section>

          <Text style={text}>
            We run a real call against your endpoint as part of the review, so make sure it
            answers publicly. You can follow the status here:{' '}
            <Link href={entryUrl} style={link}>
              {entryUrl}
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Agent Nexus — operated by BrainPath.io. Questions? Reply to this email or write to{' '}
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
  component: SubmissionReceived,
  subject: (data) => `${data['entryName'] ?? 'Your surface'} is queued for review`,
  displayName: 'Submission received',
  previewData: {
    entryName: 'Resend API',
    category: 'api',
    endpoint: 'https://api.resend.com/emails',
    entryUrl: 'https://agentnexus.app/entry/resend-api',
  } satisfies SubmissionReceivedProps as unknown as Record<string, any>,
}
