import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "report_invocation",
  title: "Report what happened when calling an interface",
  description:
    "Close the loop after actually invoking an indexed interface: report success or failure with the status code, error and latency you observed. These reports feed the reliability signal other agents rely on, and surface interfaces whose documented contract no longer matches reality. Reciprocity: each report earns +50 calls on your daily quota (max +250/day) when it is sent with your API key, or over HTTP at POST https://agentnexus.app/api/public/report.",
  inputSchema: {
    slug: z.string().trim().min(1).max(80).describe("Entry slug that was invoked."),
    outcome: z.enum(["success", "failure"]).describe("Result of the invocation."),
    status_code: z.number().int().min(100).max(599).optional().describe("HTTP status observed."),
    error: z.string().trim().max(500).optional().describe("Error message or failure reason."),
    latency_ms: z.number().int().min(0).max(600_000).optional().describe("Observed latency."),
    is_error: z
      .boolean()
      .optional()
      .describe("For MCP tools: the isError flag of the tools/call result. true means the call ran but failed, even over HTTP 200; it is recorded as a failure."),
  },
  outputSchema: { slug: z.string(), recorded: z.boolean() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ slug, outcome: declared, status_code, error: reported, latency_ms, is_error }, ctx) => {
    // A tools/call result with isError=true ran and failed: never a success.
    const outcome = is_error === true ? "failure" : declared;
    const error = is_error === true ? `isError=true${reported ? `: ${reported}` : ""}` : reported;
    const { consumeRateLimit, recordInvocationReport } = await import("@/lib/telemetry.server");
    const userId = (ctx.isAuthenticated() ? ctx.getUserId() : null) ?? null;
    const allowed = await consumeRateLimit("mcp_report", userId ?? "mcp:anonymous", 120, 3600);
    if (!allowed) {
      return {
        content: [{ type: "text", text: "Rate limit exceeded: 120 reports per hour." }],
        isError: true,
      };
    }

    const result = await recordInvocationReport({
      slug,
      outcome,
      statusCode: status_code ?? null,
      error: error ?? null,
      latencyMs: latency_ms ?? null,
      source: "mcp",
      reportedBy: userId,
      creditActor: userId ? `user:${userId}` : null,
    });
    if (!result.ok) {
      return { content: [{ type: "text", text: result.error ?? "Report rejected" }], isError: true };
    }
    const bonus = result.bonusCalls ?? 0;
    return {
      content: [
        {
          type: "text",
          text:
            `Recorded a ${outcome} report for ${slug}.` +
            (bonus > 0
              ? ` Quota bonus today: +${bonus} calls. For sustained volume (50,000 calls/day), see https://agentnexus.app/pricing.`
              : " Send reports over HTTP (POST https://agentnexus.app/api/public/report) with your API key to earn +50 calls per report, max +250/day."),
        },
      ],
      structuredContent: { slug, recorded: true },
    };
  },
});
