#!/usr/bin/env node
// Agent Nexus MCP server (stdio). Zero dependencies, Node >= 18.
// Runs locally; tools query the public Agent Nexus registry API.
import { createInterface } from "node:readline";

const API = process.env.AGENTNEXUS_URL || "https://agentnexus.app/mcp";
const KEY = process.env.AGENTNEXUS_API_KEY || "";
const VERSION = "1.1.0";

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");

async function remote(method, params) {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  if (KEY) headers.Authorization = `Bearer ${KEY}`;
  const res = await fetch(API, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? {} }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Registry request failed [${res.status}]: ${text.slice(0, 300)}`);
  const line = text.trim().startsWith("{") ? text : (text.split("\n").find((l) => l.startsWith("data:")) || "").slice(5);
  const body = JSON.parse(line);
  if (body.error) throw Object.assign(new Error(body.error.message), { code: body.error.code });
  return body.result;
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return; // notification
  try {
    let result;
    if (method === "initialize") {
      result = {
        protocolVersion: params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "agent-nexus", version: VERSION },
      };
    } else if (method === "ping") {
      result = {};
    } else if (method === "tools/list" || method === "tools/call") {
      result = await remote(method, params);
    } else {
      return send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
    send({ jsonrpc: "2.0", id, result });
  } catch (e) {
    send({ jsonrpc: "2.0", id, error: { code: e.code || -32603, message: String(e.message || e) } });
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  handle(msg);
});
