import * as React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface ToolChangeAlertProps {
  entryName: string
  changes: string[]
  entryUrl: string
  unsubscribeUrl: string
}

export function ToolChangeAlert({ entryName, changes = [], entryUrl, unsubscribeUrl }: ToolChangeAlertProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${entryName} changed`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <Container style={{ padding: '24px', maxWidth: '560px' }}>
          <Text style={{ fontSize: '11px', letterSpacing: '2px', color: '#666' }}>AGENT NEXUS</Text>
          <Heading style={{ fontSize: '20px', color: '#111' }}>{entryName} changed</Heading>
          {changes.map((c) => (
            <Text key={c} style={{ fontSize: '14px', color: '#333', margin: '4px 0' }}>• {c}</Text>
          ))}
          <Text style={{ fontSize: '14px', color: '#333' }}>
            <Link href={entryUrl}>See live status and the health card</Link>
          </Text>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#888' }}>
            You follow this tool on Agent Nexus. <Link href={unsubscribeUrl}>Stop these alerts</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ToolChangeAlert,
  subject: (d: Record<string, any>) => `${d['entryName'] ?? 'A tool you follow'} changed`,
  displayName: 'Tool change alert',
  previewData: { entryName: 'Groq API', changes: ['went down'], entryUrl: 'https://agentnexus.app', unsubscribeUrl: 'https://agentnexus.app' },
} satisfies TemplateEntry
