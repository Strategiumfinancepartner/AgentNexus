import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { consumeRateLimit, recordInvocationReport, requestActor } from "@/lib/telemetry.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  outcome: z.enum(["success", "failure"]),
  status_code: z.number().int().min(100).max(599).optional().nullable(),
  error: z.string().trim().max(500).optional().nullable(),
  latency_ms: z.number().int().min(0).max(600_000).optional().nullable(),
});

/**
 * Execution feedback from agents: what happened when they actually called an
 * indexed interface. Feeds the reliability signal that health checks alone
 * cannot see (bad auth contract, wrong shape, silent deprecation).
 */
export const Route = createFileRoute("/api/public/report")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const allowed = await consumeRateLimit("report", requestActor(request), 60, 3600);
        if (!allowed) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded: 60 reports per hour." }),
            { status: 429, headers: { ...cors, "Retry-After": "600" } },
          );
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: cors,
          });
        }

        const parsed = bodySchema.safeParse(payload);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({
              error: "Invalid body",
              expected: {
                slug: "entry slug",
                outcome: "success | failure",
                status_code: "optional int",
                error: "optional string",
                latency_ms: "optional int",
              },
            }),
            { status: 400, headers: cors },
          );
        }

        const result = await recordInvocationReport({
          slug: parsed.data.slug,
          outcome: parsed.data.outcome,
          statusCode: parsed.data.status_code ?? null,
          error: parsed.data.error ?? null,
          latencyMs: parsed.data.latency_ms ?? null,
          source: "api",
        });
        if (!result.ok) {
          return new Response(JSON.stringify({ error: result.error }), {
            status: 404,
            headers: cors,
          });
        }
        return new Response(JSON.stringify({ success: true }), { headers: cors });
      },
    },
  },
});
