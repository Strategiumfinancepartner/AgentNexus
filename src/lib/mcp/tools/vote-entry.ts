import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "vote_entry",
  title: "Vote on a registry entry",
  description:
    "Signal that an approved interface is useful, on behalf of the signed-in member. Calling it again removes the vote. One vote per member per entry.",
  inputSchema: {
    slug: z.string().trim().min(1).max(80).describe("Entry slug, e.g. 'resend-api'."),
  },
  outputSchema: { slug: z.string(), voted: z.boolean() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Sign in to Agent Nexus to vote.");
    }
    const { consumeRateLimit } = await import("@/lib/telemetry.server");
    const allowed = await consumeRateLimit("vote_entry", ctx.getUserId() ?? "unknown", 60, 3600);
    if (!allowed) {
      return {
        content: [{ type: "text", text: "Rate limit exceeded: 60 votes per hour." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();


    const { data: entry } = await supabase
      .from("entries")
      .select("id")
      .eq("slug", slug.toLowerCase())
      .eq("status", "approved")
      .maybeSingle();
    if (!entry) throw new ToolError(`No approved entry with slug "${slug}".`);
    const entryId = (entry as { id: string }).id;

    const { data: existing } = await supabase
      .from("entry_votes")
      .select("id")
      .eq("entry_id", entryId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("entry_votes")
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return {
        content: [{ type: "text", text: `Vote removed from ${slug}.` }],
        structuredContent: { slug, voted: false },
      };
    }

    const { error } = await supabase
      .from("entry_votes")
      .insert({ entry_id: entryId, user_id: userId });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Voted for ${slug}.` }],
      structuredContent: { slug, voted: true },
    };
  },
});
