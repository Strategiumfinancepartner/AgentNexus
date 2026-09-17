import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface PublisherHealthAlertProps {
  entryName: string
  entrySlug: string
  /** 'down' when a probe failed, 'recovered' when it answers again. */
  state: string
  entryUrl: string
}

export function PublisherHealthAlert({
  entryName,
  state,
  entryUrl,
}: PublisherHealthAlertProps) {
  const down = state === 'down'
  return (
    <Html>
      <Head />
      <Preview>{`${entryName} is ${down ? 'not answering' : 'answering again'}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>AGENT NEXUS</Text>
          <Heading style={heading}>
            {down ? `${entryName} is not answering` : `${entryName} is back up`}
          </Heading>
          <Text style={text}>
            {down
              ? 'Our scheduled probe could not get a valid response from your interface. Agents reading the registry now see it as down, and it ranks lower in what they get served.'
              : 'Your interface answered our latest probe. It is listed as healthy again.'}
          </Text>

          <Section style={card}>
            <Text style={row}>
              <span style={label}>Interface</span> {entryName}
            </Text>
            <Text style={row}>
              <span style={label}>State</span> {down ? 'Down' : 'Healthy'}
            </Text>
          </Section>

          <Text style={text}>
            Full probe history, latency and incidents:{' '}
            <Link href={entryUrl} style={link}>
              {entryUrl}
            </Link>
          </Text>
          <Text style={footer}>
            You receive this because your Publisher plan includes continuous monitoring and
            downtime alerts.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0b0d10', margin: 0, padding: '32px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 24px' }
const brand = {
  color: '#e0b100',
  fontFamily: 'ui-monospace, monospace',
  fontSize: '11px',
  letterSpacing: '0.28em',
}
const heading = { color: '#f3f4f6', fontSize: '20px', fontWeight: 500 as const, margin: '16px 0 0' }
const text = { color: '#9ca3af', fontSize: '14px', lineHeight: '22px' }
const card = {
  border: '1px solid #23262b',
  borderRadius: '12px',
  padding: '12px 16px',
  margin: '20px 0',
}
const row = { color: '#d1d5db', fontSize: '13px', margin: '6px 0' }
const label = {
  color: '#6b7280',
  fontFamily: 'ui-monospace, monospace',
  fontSize: '10px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  marginRight: '8px',
}
const link = { color: '#e0b100' }
const footer = { color: '#6b7280', fontSize: '11px', marginTop: '24px' }

export const template: TemplateEntry = {
  component: PublisherHealthAlert,
  subject: (data: Record<string, any>) =>
    data['state'] === 'down'
      ? `${data['entryName']} is not answering`
      : `${data['entryName']} is back up`,
  displayName: 'Publisher health alert',
  previewData: {
    entryName: 'Example API',
    entrySlug: 'example-api',
    state: 'down',
    entryUrl: 'https://agentnexus.app/registry/example-api',
  },
}
