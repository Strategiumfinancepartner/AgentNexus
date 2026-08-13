import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_submissions",
  title: "List my submissions",
  description:
    "List the interfaces the signed-in member submitted, with their moderation status and any reviewer note.",
  inputSchema: {},
  outputSchema: { count: z.number(), submissions: z.array(z.any()) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      throw new ToolError("Sign in to Agent Nexus to list your submissions.");
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("entries")
      .select("slug, name, category, status, review_note, endpoint, created_at")
      .eq("submitted_by", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const submissions = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(submissions, null, 2) }],
      structuredContent: { count: submissions.length, submissions },
    };
  },
});
