#!/usr/bin/env node
import { AgentNexus } from "./index.js";

const args = process.argv.slice(2);
if (!args.length || args[0] === "-h" || args[0] === "--help") {
  console.log('usage: agentnexus "<need>"  |  agentnexus card <slug>  |  agentnexus key');
  process.exit(0);
}
const nexus = new AgentNexus();
try {
  let out;
  if (args[0] === "card" && args[1]) out = await nexus.healthCard(args[1]);
  else if (args[0] === "key") out = { api_key: await AgentNexus.createKey() };
  else out = await nexus.discover(args.join(" "));
  console.log(JSON.stringify(out, null, 2));
} catch (err) {
  console.error("error: " + err.message);
  process.exit(1);
}
