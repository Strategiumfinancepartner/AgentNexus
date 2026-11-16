---
title: "Use Agent Nexus with your AI assistant"
published: false
description: "A short tutorial: connect your assistant, ask for a service, inspect its health evidence, then decide whether to call the provider."
canonical_url: https://agentnexus.app/guides/ai-quickstart
tags: ai, mcp, tutorial, api
---

# Use Agent Nexus with your AI assistant

A short tutorial: connect your assistant, ask for a service, inspect its health evidence, then decide whether to call the provider.

## 1. Connect the assistant, not just the model

In an assistant that supports remote MCP, add Agent Nexus using the URL below. This applies to compatible clients such as Codex, Claude Code, Cursor, VS Code/Copilot, Gemini CLI, OpenCode and WorkBuddy. Configuration names differ by client; use the client-specific guides on our Connect page. ChatGPT and Claude browser apps depend on their connector options, account plan and administrator settings. A model name alone does not guarantee connector support.

```text
https://agentnexus.app/api/public/mcp
```

## 2. Ask for an actual discovery

Paste this request into the connected assistant. A connected badge or tools/list response only confirms setup, not useful discovery. Check that the assistant actually calls discover_capabilities and returns a service contract, rather than inventing an answer.

```text
Use Agent Nexus to find a public weather API. Call discover_capabilities with need="get current weather". Show the returned service, endpoint, authentication requirements, current_health status and checked_at, plus its historical trust evidence. Do not call the provider yet.
```

## 3. No MCP? Use HTTP in the tool runner

An agent application using OpenAI, Mistral, Gemini, DeepSeek, Grok or a local model can expose the same discovery request as a function tool. The application must execute the HTTP request and return its JSON to the model. Pasting a URL into a chat without tool access does not connect it. This read-only request works without an Agent Nexus key; your model provider may charge separately.

```text
curl --fail-with-body -sS --get 'https://agentnexus.app/api/public/discover' --data-urlencode 'need=get current weather' --data-urlencode 'limit=3'
```

## 4. Inspect evidence before acting

current_health describes the latest scheduled observation, including its date; trust describes historical reliability. Neither guarantees availability at execution time. Open the returned documentation and verify the HTTPS endpoint, provider credentials, price and required inputs. Agent Nexus does not execute or authorize the provider call. A signed receipt, including cache_hit and decision_expiry, remains advisory evidence, never permission to mutate data. A new signature is not a new probe.

## 5. Complete a safe first task

For a real read-only weather task, run the repository example below from a checkout. It discovers a provider, validates its allowed HTTPS contract and checks the complete downstream response before printing the result. This needs Python 3 only. A discovery result alone is not task completion. Sending email, paying or changing data requires separate credentials, approval and safeguards in your own application.

```text
python3 examples/first_weather_task.py
```

## Optional: use one private key across compatible clients

Anonymous discovery allows 100 calls/day per source address. A free key allows 1,000 calls/day, shared across compatible clients, HTTP and SDKs. Add it in a supported private header or credential setting, never a public prompt, URL or shared configuration. Pro offers 50,000 calls/day for $29/month. Publisher costs $49/month for service publishers who need listing reports and eligible health, structure-change and stale-data alerts. No subscription is needed for this tutorial.

Client-specific setup: https://agentnexus.app/connect

Free key: https://agentnexus.app/free-key

Repository: https://github.com/Strategiumfinancepartner/AgentNexus

Agent Nexus / agentnexus.app
