export const tutorialTitle = "Give your AI agent a fallback plan when an API goes down";
export const tutorialDescription = "Use Agent Nexus from any compatible MCP client, HTTP app, SDK or workflow to discover alternatives to a failing API and inspect the evidence before switching.";
export const tutorialPath = "/guides/api-fallbacks";

export const tutorialSections = [
  {
    title: "Discovery is not an automatic switch",
    paragraphs: [
      "An API starts failing. Your agent can keep retrying, ask you what to do, or look for another service that can do the same job. Agent Nexus helps with that third option: discovering APIs, MCP servers and CLIs, with their call contracts and observed health.",
      "It is a registry, not a proxy. It does not move credentials, rewrite your integration or execute the replacement for you. This walkthrough finds candidates and checks their suitability before any real action.",
    ],
  },
  {
    title: "1. Connect your agent",
    paragraphs: [
      "Agent Nexus is not limited to Claude Code. Connect any client that supports remote HTTP MCP, such as compatible configurations of Claude, ChatGPT or Cursor, using the endpoint below. Availability and authentication settings depend on your client.",
      "The same Agent Nexus key works across supported MCP connections, direct HTTP requests, our Python and JavaScript SDKs, CLI, n8n, LangChain, CrewAI and LlamaIndex integrations. Configure it separately in each integration; requests using the same key share its daily quota. It does not replace the credentials needed by the external APIs you discover.",
      "Public discovery also works without a key. For keyed usage, generate a key at https://agentnexus.app/keys and keep it private. The key belongs in the integration's API key setting or the x-api-key request header, not in a chat prompt. A client that cannot send authentication headers cannot use the key through that direct connection.",
    ],
    language: "text",
    code: "Remote MCP endpoint: https://agentnexus.app/api/public/mcp\nOptional authentication header: x-api-key: YOUR_AGENT_NEXUS_KEY",
    after: "Client-specific configurations are at https://agentnexus.app/connect. Confirm that discover_capabilities and get_entry appear in the available tools. A connection or tools/list response is only a setup check, not proof the agent has used discovery.",
  },
  {
    title: "2. Give it a specific task",
    paragraphs: [
      "Try this prompt. It describes a hypothetical outage, not a claim that Resend is currently down.",
    ],
    language: "prompt",
    code: "Imagine Resend is unavailable. Use Agent Nexus to find APIs for sending a transactional email. Exclude Resend, inspect a candidate with get_entry, and compare authentication, documentation and observed health. Do not send an email or switch providers without my approval.",
    after: "A useful tool call is discover_capabilities with need set to ‘Resend is down, find an alternative to send a transactional email’ and category set to ‘api’. Tool choice still depends on the client and model; if it does not call discovery, explicitly ask it to use discover_capabilities.",
  },
  {
    title: "3. Try the same discovery over HTTP",
    paragraphs: ["You can inspect the response yourself without an AI client. This read-only request uses the same Agent Nexus key as your other integrations and does not send an email. Set AGENTNEXUS_API_KEY privately in your environment first; omit the header for anonymous discovery."],
    language: "bash",
    code: [
      "curl -sS --get 'https://agentnexus.app/api/public/discover' \\",
      "  -H \"x-api-key: $AGENTNEXUS_API_KEY\" \\",
      "  --data-urlencode 'need=Resend is down, find an alternative to send a transactional email' \\",
      "  --data-urlencode 'category=api' \\",
      "  --data-urlencode 'limit=3'",
    ].join("\n"),
    after: "In a live check on 23 October 2026, this query returned Courier, SMTP2GO and Mailjet. This is an observation, not a fixed ranking: the catalog, scores and results can change. Matching candidates are not necessarily drop-in replacements.",
  },
  {
    title: "4. Inspect the contract and the evidence",
    paragraphs: [
      "Use get_entry with the candidate’s slug, or read its public JSON entry. For example:",
    ],
    language: "bash",
    code: "curl -sS 'https://agentnexus.app/api/public/registry/mailjet-api'",
    after: "Compare the endpoint, authentication, request and response formats, documentation and limits. In discovery, trust includes reliability_score, last_probe_at, last_probe_ok, samples and agent_reports. A high score is evidence of observed health, not a guarantee that your particular request will succeed. Schema checks apply to selected entries, not the whole catalog; no reports means no real invocation reports were recorded for that entry.",
  },
  {
    title: "5. Make the switch a policy decision",
    paragraphs: [
      "Before using another email provider, confirm that its API supports the exact operation, obtain the right credentials, configure your sending domain and test safely. Check cost, data handling and duplicate-send risks. Discovery cannot do those steps for you.",
      "For payments and other high-stakes actions, require an explicit human or application-policy check. A reachable endpoint does not establish equivalent behavior, regulatory suitability or safe retry semantics.",
      "If no suitable candidate is returned, stop rather than forcing the top-ranked result. When an invocation actually happens, report its real outcome using the reporting contract returned with the discovery response. Never report success just because discovery worked.",
    ],
  },
  {
    title: "What counts as a successful test?",
    paragraphs: [
      "The agent calls discover_capabilities for the task, opens a relevant entry, explains what the evidence does and does not prove, and stops for approval before taking the external action. Merely connecting to MCP or reading the tool list does not meet that bar.",
      "The goal is not blind failover. It is to give an agent a better-informed next step when its usual service fails.",
    ],
  },
];

export const tutorialMarkdown = `---
title: "${tutorialTitle}"
published: false
description: "${tutorialDescription}"
tags: ai, mcp, tutorial, api
canonical_url: https://agentnexus.app${tutorialPath}
---

# ${tutorialTitle}

${tutorialSections.map((section) => `## ${section.title}\n\n${section.paragraphs.join("\n\n")}${section.code ? `\n\n\`\`\`${section.language === "prompt" ? "text" : section.language}\n${section.code}\n\`\`\`` : ""}${section.after ? `\n\n${section.after}` : ""}`).join("\n\n")}

More client configurations: https://agentnexus.app/connect

Agent Nexus / agentnexus.app
`;