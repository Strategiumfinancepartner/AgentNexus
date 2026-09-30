/**
 * Optional submitter contact + decision notification.
 *
 * Agent keys carry no account and no email, so a submitter who leaves a
 * contact address is the only one we can tell "your listing is live". The
 * address lives in its own table (never in the public entry columns) and is
 * used for exactly one message: the moderation decision.
 */

export async function storeSubmissionContact(
  entryId: string,
  email: string | null | undefined,
): Promise<void> {
  const value = (email ?? "").trim();
  if (!value || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value) || value.length > 200) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("submission_contacts")
      .upsert({ entry_id: entryId, email: value.toLowerCase() }, { onConflict: "entry_id" });
  } catch (error) {
    console.error("submission_contacts upsert failed", error);
  }
}

/** Emails the submitter once a reviewer decided. Never throws. */
export async function notifySubmissionDecision(
  entryId: string,
  decision: "approved" | "rejected",
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: contact } = await admin
      .from("submission_contacts")
      .select("email, notified_at, notified_decision")
      .eq("entry_id", entryId)
      .maybeSingle();
    if (!contact?.email) return { sent: false, reason: "no_contact" };
    if (contact.notified_decision === decision) return { sent: false, reason: "already_sent" };

    const { data: entry } = await admin
      .from("entries")
      .select("slug, name, review_note")
      .eq("id", entryId)
      .maybeSingle();
    if (!entry) return { sent: false, reason: "no_entry" };

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail("submission-decision", contact.email, {
      idempotencyKey: `decision:${entryId}:${decision}`,
      templateData: {
        entryName: entry.name,
        slug: entry.slug,
        decision,
        note: entry.review_note ?? "",
        entryUrl: `https://agentnexus.app/entry/${entry.slug}`,
      },
    });

    await admin
      .from("submission_contacts")
      .update({ notified_at: new Date().toISOString(), notified_decision: decision })
      .eq("entry_id", entryId);

    return { sent: result.sent };
  } catch (error) {
    console.error("submission decision email failed", error);
    return { sent: false, reason: "error" };
  }
}
