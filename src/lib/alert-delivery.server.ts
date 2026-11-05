/**
 * Alert delivery with retries. Every alert (email or webhook) is recorded in
 * watch_deliveries; a failed send stays pending and is retried by the hourly
 * cycle (up to MAX_ATTEMPTS) instead of being silently dropped.
 */
type Admin = { from: (t: string) => any };

export const MAX_ATTEMPTS = 5;

export type Delivery = {
  entryId: string;
  watchId?: string | null;
  audience: "watch" | "publisher";
  channel: "email" | "webhook";
  target: string;
  secret?: string | null;
  /** Webhook: JSON body. Email: { template, templateData, idempotencyKey }. */
  payload: Record<string, unknown>;
};

export async function signBody(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** One send attempt. Throws on failure. */
export async function sendOnce(d: Pick<Delivery, "channel" | "target" | "secret" | "payload">): Promise<void> {
  if (d.channel === "webhook") {
    const body = JSON.stringify(d.payload);
    const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "AgentNexus-Watch/1.1" };
    if (d.secret) headers["x-agentnexus-signature"] = `sha256=${await signBody(d.secret, body)}`;
    const res = await fetch(d.target, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (res.status < 200 || res.status >= 300) throw new Error(`webhook HTTP ${res.status}`);
    return;
  }
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const p = d.payload as { template: string; templateData: Record<string, unknown>; idempotencyKey: string };
  await sendTemplateEmail(p.template as never, d.target, { templateData: p.templateData, idempotencyKey: p.idempotencyKey } as never);
}

export function nextAttemptAt(attempts: number, now = Date.now()): string {
  return new Date(now + 3600_000 * 2 ** Math.max(0, attempts - 1)).toISOString();
}

/** Try now; record the outcome. Returns true when the alert went out. */
export async function deliver(admin: Admin, d: Delivery): Promise<boolean> {
  let error: string | null = null;
  try { await sendOnce(d); } catch (e) { error = e instanceof Error ? e.message : String(e); }
  try {
    await admin.from("watch_deliveries").insert({
      entry_id: d.entryId, watch_id: d.watchId ?? null, audience: d.audience, channel: d.channel,
      target: d.target, secret: d.secret ?? null, payload: d.payload, attempts: 1,
      status: error ? "pending" : "sent", last_error: error,
      sent_at: error ? null : new Date().toISOString(), next_attempt_at: nextAttemptAt(1),
    });
  } catch (e) { console.error("delivery log failed", e); }
  return !error;
}

/** Called each hourly cycle. */
export async function retryPendingDeliveries(admin: Admin): Promise<{ retried: number; sent: number; failed: number }> {
  const { data } = await admin.from("watch_deliveries")
    .select("id, channel, target, secret, payload, attempts")
    .eq("status", "pending").lte("next_attempt_at", new Date().toISOString()).limit(50);
  let sent = 0, failed = 0;
  for (const row of data ?? []) {
    const attempts = row.attempts + 1;
    try {
      await sendOnce(row);
      await admin.from("watch_deliveries").update({ status: "sent", attempts, sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      sent++;
    } catch (e) {
      const giveUp = attempts >= MAX_ATTEMPTS;
      if (giveUp) failed++;
      await admin.from("watch_deliveries").update({
        status: giveUp ? "failed" : "pending", attempts, last_error: e instanceof Error ? e.message : String(e),
        next_attempt_at: nextAttemptAt(attempts),
      }).eq("id", row.id);
    }
  }
  return { retried: (data ?? []).length, sent, failed };
}
