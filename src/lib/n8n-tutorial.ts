export const tutorialTitle = "Check an API's health in n8n before your workflow calls it";
export const tutorialDescription = "A free, importable n8n template: one HTTP Request node asks Agent Nexus whether your provider is up and which healthy alternatives exist, before a workflow sends an email or calls any API.";
export const tutorialPath = "/guides/n8n-health-check";
export const n8nTemplatePath = "/templates/n8n-agent-nexus-email-health-check.json";

export const tutorialSections = [
  {
    title: "Why workflows fail silently",
    paragraphs: [
      "A scheduled n8n workflow calls the same provider at 2 AM every night. When that provider is down or changed its response, the workflow either errors out or, worse, keeps going with bad data. Nobody looks until a customer complains.",
      "Agent Nexus probes APIs and MCP servers continuously and exposes the result over plain HTTP. One request before the risky step tells your workflow whether the provider is up right now, how reliable it has been, and which healthy alternatives exist. It is advisory only: it never calls the alternative for you.",
    ],
  },
  {
    title: "1. Import the template",
    paragraphs: [
      "Download the template below, then in n8n choose Import from file (or paste the JSON on the canvas). It has three nodes: a trigger, an HTTP Request to Agent Nexus discovery, and a Code node that makes an advisory decision.",
    ],
    language: "text",
    code: "https://agentnexus.app/templates/n8n-agent-nexus-email-health-check.json",
    after: "Replace the Manual Trigger with your own Schedule or Webhook trigger, and put the Decide node right before the step that actually sends.",
  },
  {
    title: "2. Add your free key (optional)",
    paragraphs: [
      "Discovery works without a key (100 calls/day per address). A free key raises that to 1,000 calls/day, enough for a check before every run of most workflows. Create one at https://agentnexus.app/keys and set it as the AGENTNEXUS_API_KEY environment variable of your n8n instance, or put it directly in the x-api-key header of the HTTP Request node. Keep it out of shared workflow exports.",
      "If you prefer a ready node, the community package n8n-nodes-agentnexus is also available in n8n.",
    ],
  },
  {
    title: "3. What the HTTP Request sends",
    paragraphs: ["This is the same read-only request the node performs. It does not send an email."],
    language: "bash",
    code: [
      "curl -sS --get 'https://agentnexus.app/api/public/discover' \\",
      "  -H \"x-api-key: $AGENTNEXUS_API_KEY\" \\",
      "  --data-urlencode 'need=send a transactional email' \\",
      "  --data-urlencode 'category=api' \\",
      "  --data-urlencode 'limit=3'",
    ].join("\n"),
    after: "Each match carries current_health (status and checked_at from the latest probes), trust (reliability_score, samples, last_probe_at) and call (endpoint, auth, docs). current_health answers 'is it up now'; trust answers 'has it been reliable'. Do not confuse the two.",
  },
  {
    title: "4. The advisory decision",
    paragraphs: [
      "The Code node looks for your preferred provider (smtp2go-api in the template, change the slug to yours). If it is up, the workflow continues. If not, it returns needs_approval with a healthy alternative, or stop if none is returned.",
      "Route needs_approval to a Slack, email or Wait node for a human, not straight to another provider. Switching email providers needs credentials, a verified sending domain and duplicate-send protection; a 2 AM failure should not become three copies in someone's inbox.",
    ],
  },
  {
    title: "5. Report what really happened",
    paragraphs: [
      "Each discovery response includes a report contract. After the real call, POST its true outcome to https://agentnexus.app/api/public/report. Honest reports keep reliability scores grounded in real usage and add up to +250 calls/day to your quota. Never report success just because discovery worked.",
    ],
  },
  {
    title: "Going further",
    paragraphs: [
      "The same pattern works for any step: payments, scraping, search, LLM providers. Change the need text and the preferred slug. Pro (29 $/month, 50,000 calls/day) is only useful if you check thousands of runs per day; the free key covers most workflows.",
      "If you publish an API or MCP server yourself, Agent Nexus Publisher (49 $/month) sends you a signed alert when your service fails two probes in a row or its tool list drifts, before your users' workflows notice.",
    ],
  },
];

export const tutorialMarkdown = `---
title: "${tutorialTitle}"
published: false
description: "${tutorialDescription}"
tags: n8n, automation, ai, api
canonical_url: https://agentnexus.app${tutorialPath}
---

# ${tutorialTitle}

${tutorialSections.map((section) => `## ${section.title}\n\n${section.paragraphs.join("\n\n")}${section.code ? `\n\n\`\`\`${section.language === "prompt" ? "text" : section.language}\n${section.code}\n\`\`\`` : ""}${section.after ? `\n\n${section.after}` : ""}`).join("\n\n")}

Template: https://agentnexus.app${n8nTemplatePath}

Agent Nexus / agentnexus.app
`;