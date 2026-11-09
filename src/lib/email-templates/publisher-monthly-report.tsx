import * as React from 'react'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface PublisherMonthlyReportProps {
  paying: boolean
  entryName: string
  month: string
  lines: { label: string; value: string }[]
  incidents: { at: string; detail: string }[]
  recommendations: string[]
  robotNote: string
  entryUrl: string
}

export function PublisherMonthlyReport(p: PublisherMonthlyReportProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${p.entryName} — Agent Nexus report for ${p.month}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>AGENT NEXUS</Text>
          <Heading style={heading}>{p.entryName}: {p.month} report</Heading>
          <Text style={text}>Measured from registry logs and probes. Search crawlers and monitoring services are excluded from every number below.</Text>
          <Section style={card}>
            {(p.lines ?? []).map((l) => (
              <Text key={l.label} style={row}><span style={label}>{l.label}</span> {l.value}</Text>
            ))}
          </Section>
          <Text style={small}>{p.robotNote}</Text>
          {p.paying && (p.incidents ?? []).length > 0 && (
            <Section style={card}>
              <Text style={row}><span style={label}>Incidents</span></Text>
              {p.incidents.map((i) => <Text key={i.at + i.detail} style={row}>{i.at} — {i.detail}</Text>)}
            </Section>
          )}
          {(p.recommendations ?? []).map((r) => <Text key={r} style={text}>• {r}</Text>)}
          <Text style={text}>Listing and probe history: <Link href={p.entryUrl} style={link}>{p.entryUrl}</Link></Text>
          {!p.paying && <Text style={text}><Link href="https://agentnexus.app/pricing" style={link}>See the Publisher plan</Link></Text>}
          <Text style={footer}>You receive this monthly because you submitted this listing to Agent Nexus. Reply to stop.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0b0d10', margin: 0, padding: '32px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px' }
const brand = { color: '#e0b100', fontFamily: 'ui-monospace, monospace', fontSize: '11px', letterSpacing: '0.28em' }
const heading = { color: '#f3f4f6', fontSize: '20px', fontWeight: 500 as const, margin: '16px 0 0' }
const text = { color: '#9ca3af', fontSize: '14px', lineHeight: '22px' }
const small = { color: '#6b7280', fontSize: '12px' }
const card = { border: '1px solid #23262b', borderRadius: '12px', padding: '12px 16px', margin: '20px 0' }
const row = { color: '#d1d5db', fontSize: '13px', margin: '6px 0' }
const label = { color: '#6b7280', fontFamily: 'ui-monospace, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginRight: '8px' }
const link = { color: '#e0b100' }
const footer = { color: '#6b7280', fontSize: '11px', marginTop: '24px' }

export const template: TemplateEntry = {
  component: PublisherMonthlyReport,
  subject: (d: Record<string, any>) => `${d['entryName']} - Agent Nexus report ${d['month']}`,
  displayName: 'Publisher monthly report',
  previewData: {
    paying: false, entryName: 'Example API', month: '2026-11',
    lines: [{ label: 'Search appearances', value: '12' }, { label: 'Listing opens by AI agents and developers', value: '3' }, { label: 'Availability', value: '99.8% (720 probes)' }],
    incidents: [], recommendations: ['Publisher ($49/month) adds alerts.'], robotNote: '5 additional opens came from crawlers and monitors and are excluded above.',
    entryUrl: 'https://agentnexus.app/registry/example-api',
  },
}
