import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { slugify } from "@/lib/registry-core";

export default defineTool({
  name: "submit_entry",
  title: "Submit an interface to the registry",
  description:
    "Register a new interface (HTTP API, MCP server or CLI) in the Agent Nexus catalogue. Callers authenticate either as a signed-in member or with a free agent key (POST https://agentnexus.app/api/public/keys), which allows one submission per key and per source address per 24 hours. This is a write: it creates a pending row, it does NOT publish anything — every submission is reviewed by a human before it becomes discoverable, so nothing you send here is visible to other agents until it is approved. Nothing is overwritten or deleted, and re-submitting the same name creates a second pending row rather than updating the first. Five fields are required (name, category, summary, endpoint, auth_mode); everything else is optional but directly decides whether the entry is approved and how well it ranks: capabilities[] is what other agents are matched against, so list concrete verbs, and docs_url plus invocation_example are what a reviewer checks first. Rate limited to 20 submissions per hour for members and 1 per 24 hours per agent key and per source address, and the endpoint must answer a live health probe to keep a reliability score. Returns {slug, status}; poll GET https://agentnexus.app/api/public/submission?slug=<slug> for the decision, or pass contact_email to be emailed instead. Use list_my_submissions to review what you already submitted; use search_registry first to check the interface is not already listed.",
  inputSchema: {
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .describe(
        "Public product name as its vendor spells it, 1-80 chars, e.g. 'Resend' or 'GitHub MCP Server'. Do not add the category or a tagline here; the slug is derived from this name plus the category.",
      ),
    category: z
      .enum(["api", "mcp", "cli"])
      .describe(
        "Which layer this interface belongs to: 'api' for an HTTP contract called directly, 'mcp' for a Model Context Protocol tool server, 'cli' for a command-line surface. Decides how endpoint is interpreted (URL vs command).",
      ),
    summary: z
      .string()
      .trim()
      .min(10)
      .max(300)
      .describe(
        "One line an agent can rank on: what the interface does, 10-300 chars. State the capability, not the marketing (e.g. 'Send transactional email over HTTP with templates and delivery webhooks').",
      ),
    endpoint: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe(
        "How the interface is actually reached, max 500 chars. For category 'api' the base URL (https://api.example.com/v1); for 'mcp' the server URL (https://example.com/mcp) or stdio command; for 'cli' the install-and-run command (npx example-cli). Must be reachable: it is probed daily and a dead endpoint loses its reliability score.",
      ),
    auth_mode: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .describe(
        "How a caller authenticates, in a few words: 'none', 'Bearer API key', 'API key in query', 'OAuth 2.1', 'Basic auth'. Write 'none' rather than leaving it vague; auth_params carries the individual credentials.",
      ),
    capabilities: z
      .array(z.string().trim().min(2).max(40))
      .max(12)
      .default([])
      .describe(
        "Up to 12 lowercase hyphenated verbs an agent's need is matched against, e.g. ['send-email','list-templates','verify-address']. This is the single field that drives discovery: an entry with no capabilities is rarely returned. One action per item, 2-40 chars, no sentences.",
      ),
    auth_params: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1)
            .max(60)
            .describe("Exact credential name as sent, e.g. 'Authorization' or 'api_key'."),
          location: z
            .string()
            .trim()
            .min(1)
            .max(40)
            .describe(
              "Where the credential goes: 'header', 'query', 'env' (CLI/MCP environment variable) or 'flag' (CLI argument).",
            ),
          required: z
            .boolean()
            .default(true)
            .describe("False only when the call also works without this credential. Defaults to true."),
        }),
      )
      .max(10)
      .default([])
      .describe(
        "Up to 10 individual credentials the caller must supply, each {name, location, required}. Leave empty when auth_mode is 'none'. Never include credential values here, only their names.",
      ),
    input_format: z
      .string()
      .trim()
      .max(120)
      .default("")
      .describe(
        "MIME type or shape the interface accepts, e.g. 'application/json', 'multipart/form-data', 'command-line flags'. Empty string when not applicable.",
      ),
    output_format: z
      .string()
      .trim()
      .max(120)
      .default("")
      .describe(
        "MIME type or shape the interface returns, e.g. 'application/json', 'text/csv', 'stdout text'. Empty string when not applicable.",
      ),
    rate_limit: z
      .string()
      .trim()
      .max(120)
      .default("")
      .describe(
        "Published quota in the vendor's own words, e.g. '100 requests/minute', '10k calls/month on the free tier'. Leave empty rather than guessing.",
      ),
    pricing: z
      .string()
      .trim()
      .max(120)
      .default("")
      .describe(
        "Cost in one short phrase, e.g. 'Free', 'Free tier then $20/month', 'Usage-based, $0.001/call'. Agents filter on this, so be concrete.",
      ),
    invocation_example: z
      .string()
      .trim()
      .max(1000)
      .default("")
      .describe(
        "One copy-pasteable call that works: a curl command, a JSON-RPC body or a CLI line, max 1000 chars. Never include a real credential — use a placeholder such as $API_KEY. This is what reviewers check first.",
      ),
    docs_url: z
      .string()
      .trim()
      .url()
      .max(500)
      .optional()
      .describe(
        "Absolute https URL of the developer documentation (not the marketing home page). Omit if none exists; submissions without it are approved more slowly.",
      ),
    tags: z
      .array(z.string().trim().min(1).max(24))
      .max(8)
      .default([])
      .describe(
        "Up to 8 short domain labels for browsing, e.g. ['email','messaging']. Domains, not actions — actions belong in capabilities[].",
      ),
    description: z
      .string()
      .trim()
      .max(4000)
      .default("")
      .describe(
        "Optional long form, max 4000 chars: what the interface does well, notable limits, quirks an agent should know before calling. Plain text; no HTML.",
      ),
    contact_email: z
      .string()
      .trim()
      .email()
      .max(200)
      .optional()
      .describe(
        "Optional. Where to email the moderation decision (approved or rejected, with the reason). Never published, never shared.",
      ),
  },
  outputSchema: { slug: z.string(), status: z.string() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Sign in to Agent Nexus to submit an interface.");
    }
    const { consumeRateLimit } = await import("@/lib/telemetry.server");
    const allowed = await consumeRateLimit("submit_entry", ctx.getUserId() ?? "unknown", 20, 3600);
    if (!allowed) {
      return {
        content: [{ type: "text", text: "Rate limit exceeded: 20 submissions per hour." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);

    const base = slugify(`${input.name}-${input.category}`) || `entry-${Date.now()}`;
    let slug = base;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase
        .from("entries")
        .insert({
          slug,
          name: input.name,
          category: input.category,
          summary: input.summary,
          description: input.description,
          auth_mode: input.auth_mode,
          endpoint: input.endpoint,
          docs_url: input.docs_url ?? null,
          tags: input.tags,
          capabilities: input.capabilities,
          auth_params: input.auth_params,
          input_format: input.input_format,
          output_format: input.output_format,
          rate_limit: input.rate_limit,
          pricing: input.pricing,
          invocation_example: input.invocation_example,
          submitted_by: ctx.getUserId(),
        })
        .select("id, slug, status")
        .single();

      if (!error) {
        const row = data as { id: string; slug: string; status: string };
        if (input.contact_email) {
          const { storeSubmissionContact } = await import("@/lib/submission-notify.server");
          await storeSubmissionContact(row.id, input.contact_email);
        }
        const out = { slug: row.slug, status: row.status };
        return {
          content: [
            {
              type: "text",
              text:
                `Submitted "${input.name}" as ${row.slug} (status: ${row.status}). A reviewer will approve it before it becomes publicly discoverable.\n` +
                `Track the decision: GET https://agentnexus.app/api/public/submission?slug=${row.slug}` +
                (input.contact_email
                  ? `\nWe will also email ${input.contact_email} once a reviewer decides.`
                  : `\nPass contact_email next time and we email you the decision.`),
            },
          ],
          structuredContent: out,
        };
      }
      if (error.code === "23505") {
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
        continue;
      }
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    throw new ToolError("Could not allocate a unique slug for this entry.");
  },
});
