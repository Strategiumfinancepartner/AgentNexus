import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { slugify } from "@/lib/registry-core";

export default defineTool({
  name: "submit_entry",
  title: "Submit an interface to the registry",
  description:
    "Submit an API, MCP server or CLI to Agent Nexus on behalf of the signed-in member. The entry lands in the moderation queue; describe its capabilities precisely so other agents can match it to a need.",
  inputSchema: {
    name: z.string().trim().min(1).max(80),
    category: z.enum(["api", "mcp", "cli"]),
    summary: z.string().trim().min(10).max(300).describe("One line: what it does."),
    endpoint: z.string().trim().min(1).max(500).describe("Base URL, MCP URL or command."),
    auth_mode: z.string().trim().min(1).max(120).describe("e.g. 'Bearer API key', 'OAuth 2.1', 'none'."),
    capabilities: z
      .array(z.string().trim().min(2).max(40))
      .max(12)
      .default([])
      .describe("Machine-matchable verbs, e.g. ['send-email','list-templates']."),
    auth_params: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(60),
          location: z.string().trim().min(1).max(40).describe("header | query | env | flag"),
          required: z.boolean().default(true),
        }),
      )
      .max(10)
      .default([]),
    input_format: z.string().trim().max(120).default(""),
    output_format: z.string().trim().max(120).default(""),
    rate_limit: z.string().trim().max(120).default(""),
    pricing: z.string().trim().max(120).default(""),
    invocation_example: z.string().trim().max(1000).default(""),
    docs_url: z.string().trim().url().max(500).optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
    description: z.string().trim().max(4000).default(""),
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
        .select("slug, status")
        .single();

      if (!error) {
        const row = data as { slug: string; status: string };
        return {
          content: [
            {
              type: "text",
              text: `Submitted "${input.name}" as ${row.slug} (status: ${row.status}). A reviewer will approve it before it becomes publicly discoverable.`,
            },
          ],
          structuredContent: row,
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
