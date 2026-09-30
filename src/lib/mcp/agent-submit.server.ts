import { z } from "zod";
import submitEntryTool from "@/lib/mcp/tools/submit-entry";

/**
 * submit_entry for machine callers holding a self-service agent key
 * (minted at POST /api/public/keys). Same moderation queue as human
 * submissions — nothing goes public without reviewer approval — but the
 * submitter is an agent key instead of a signed-in member.
 *
 * Abuse bound: 1 submission per key AND per source address per 24h.
 */

type ResolvedKey = {
  keyId: string;
  userId: string | null;
  label: string | null;
  tier: string;
  actor: string;
};

function textResult(text: string, isError = true) {
  return { content: [{ type: "text", text }], isError };
}

export async function handleAgentSubmitEntry(args: unknown, request: Request) {
  const schema = submitEntryTool.inputSchema as unknown as z.ZodRawShape;
  const parsed = z.object(schema).safeParse(args ?? {});
  if (!parsed.success) {
    return textResult(`Invalid arguments: ${parsed.error.message}`);
  }
  const input = parsed.data as {
    name: string;
    category: string;
    summary: string;
    description: string;
    auth_mode: string;
    endpoint: string;
    docs_url?: string;
    tags: string[];
    capabilities: string[];
    auth_params: { name: string; location: string; required: boolean }[];
    input_format: string;
    output_format: string;
    rate_limit: string;
    pricing: string;
    invocation_example: string;
    contact_email?: string;
  };

  const { resolveApiKey } = await import("@/lib/quota.server");
  const key: ResolvedKey | null = await resolveApiKey(request);
  if (!key) {
    return textResult(
      "submit_entry requires a free agent key. Mint one with a single request — " +
        'POST {"agent":"your-name","purpose":"what you plan to submit"} to /api/public/keys — ' +
        "then send it as the x-api-key header and retry. 1 submission per key and per source address per 24h; " +
        "every entry is reviewed by a human before it becomes publicly discoverable.",
    );
  }

  const { consumeRateLimit } = await import("@/lib/telemetry.server");
  // Also bound per network address: minting a fresh key per submission
  // must not bypass the daily limit (seen 27-28 Sept, 15 keys in 20h).
  const { actorFor } = await import("@/lib/abuse-guard.server");
  const ipOk = await consumeRateLimit("agent_submit_entry_ip", actorFor(request), 1, 86_400);
  if (!ipOk) {
    return textResult(
      "Submission limit reached: 1 entry per source address per 24h, whatever the key. Submit your next interface tomorrow.",
    );
  }
  const ok = await consumeRateLimit("agent_submit_entry", key.actor, 1, 86_400);
  if (!ok) {
    return textResult(
      "Submission limit reached: 1 entry per key per 24h. Reuse this key tomorrow, or mint a second key (up to 5 per source per 24h) if you genuinely list a different server.",
    );
  }

  // Automatic promotional / prompt-injection screen, before the human queue.
  const { screenSubmission, blockMessage } = await import("@/lib/moderation/spam-filter");
  const verdict = screenSubmission({
    name: input.name,
    summary: input.summary,
    description: input.description,
    endpoint: input.endpoint,
    docs_url: input.docs_url ?? null,
    tags: input.tags,
    capabilities: input.capabilities,
    invocation_example: input.invocation_example,
    pricing: input.pricing,
  });
  if (verdict.action === "block") {
    // Keep an audit trail of every refusal so a reviewer can later verify the
    // filter only blocks genuine spam (visible in the moderation page).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).from("spam_blocks").insert({
        actor: key.actor,
        name: input.name,
        category: input.category,
        summary: input.summary,
        endpoint: input.endpoint,
        payload: input,
        score: verdict.score,
        reasons: verdict.reasons,
      });
    } catch (logError) {
      console.error("spam_blocks insert failed", logError);
    }
    return textResult(blockMessage(verdict));
  }
  const autoNote =
    verdict.action === "flag"
      ? `auto-flag (score ${verdict.score}): ${verdict.reasons.join(", ")}`
      : null;

  const { slugify } = await import("@/lib/registry-core");
  const base = slugify(`${input.name}-${input.category}`) || `entry-${Date.now()}`;
  let slug = base;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await (supabaseAdmin as any)
      .from("entries")
      .insert({
        slug,
        name: input.name,
        category: input.category,
        summary: input.summary,
        description: input.description ?? "",
        auth_mode: input.auth_mode,
        endpoint: input.endpoint,
        docs_url: input.docs_url ?? null,
        tags: input.tags ?? [],
        capabilities: input.capabilities ?? [],
        auth_params: input.auth_params ?? [],
        input_format: input.input_format ?? "",
        output_format: input.output_format ?? "",
        rate_limit: input.rate_limit ?? "",
        pricing: input.pricing ?? "",
        invocation_example: input.invocation_example ?? "",
        submitted_by: key.userId,
        submitted_by_actor: key.label ?? `agent key ${key.keyId.slice(0, 8)}`,
        review_note: autoNote,
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
              `Submitted "${input.name}" as ${row.slug} (status: ${row.status}). A human reviewer approves every entry before it becomes publicly discoverable. You can submit your next entry with this key in 24h.\n` +
              `Track the decision without polling the catalogue: GET https://agentnexus.app/api/public/submission?slug=${row.slug}` +
              (input.contact_email
                ? `\nWe will also email ${input.contact_email} once a reviewer decides (approved or rejected, with the reason).`
                : `\nTip: pass contact_email on your next submission and we email you the decision instead.`),
          },
        ],
        structuredContent: out,
      };
    }
    if (error.code === "23505") {
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      continue;
    }
    return textResult(error?.message ?? "Submission failed");
  }
  return textResult("Could not allocate a unique slug for this entry.");
}
