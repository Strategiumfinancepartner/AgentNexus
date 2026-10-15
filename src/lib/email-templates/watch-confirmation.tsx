import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface WatchConfirmationProps {
  entryName: string
  confirmUrl: string
}

export function WatchConfirmation({ entryName, confirmUrl }: WatchConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Confirm your alerts for ${entryName}`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <Container style={{ padding: '24px', maxWidth: '560px' }}>
          <Text style={{ fontSize: '11px', letterSpacing: '2px', color: '#666' }}>AGENT NEXUS</Text>
          <Heading style={{ fontSize: '20px', color: '#111' }}>Confirm your alert for {entryName}</Heading>
          <Text style={{ fontSize: '14px', color: '#333' }}>
            Someone (hopefully you) asked Agent Nexus to send alerts about {entryName} to this address:
            when it goes down, comes back up, or its interface changes.
          </Text>
          <Text style={{ fontSize: '14px', color: '#333', margin: '20px 0' }}>
            <Button
              href={confirmUrl}
              style={{
                backgroundColor: '#111',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Confirm alerts
            </Button>
          </Text>
          <Text style={{ fontSize: '12px', color: '#666' }}>
            If the button does not work, open this link: {confirmUrl}
          </Text>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#888' }}>
            If you did not request this, ignore this email — no alerts will be sent. This confirmation protects
            your address: nobody can subscribe you without access to your inbox.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WatchConfirmation,
  subject: (d: Record<string, any>) => `Confirm your alerts for ${d['entryName'] ?? 'a tool'}`,
  displayName: 'Watch confirmation',
  previewData: { entryName: 'Stripe API', confirmUrl: 'https://agentnexus.app/api/public/watch?confirm=x' },
} satisfies TemplateEntry
