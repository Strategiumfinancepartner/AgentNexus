/**
 * Tool watches ("drift alerts"): a subscriber follows one entry and hears
 * about it when its observed state changes: down, back up, schema verdict
 * flips, or its advertised tool list changes (names, descriptions, schemas).
 * State is a compact string; a watch fires when it differs from last_state.
 */

export const FREE_WATCH_LIMIT = 3;
export const PRO_WATCH_LIMIT = 100;

async function sha(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export type WatchSnapshot = {
  up: boolean | null;
  schema_ok: boolean | null;
  tools: unknown;
};

export async function watchState(s: WatchSnapshot): Promise<string> {
  const tools = Array.isArray(s.tools) && s.tools.length ? await sha(JSON.stringify(s.tools)) : "-";
  return `up=${s.up ?? "?"};schema=${s.schema_ok ?? "?"};tools=${tools}`;
}

function describeChange(prev: string, next: string): string[] {
  const p = Object.fromEntries(prev.split(";").map((x) => x.split("=")));
  const n = Object.fromEntries(next.split(";").map((x) => x.split("=")));
  const out: string[] = [];
  if (p.up !== n.up) out.push(n.up === "true" ? "came back up" : n.up === "false" ? "went down" : "liveness unknown");
  if (p.schema !== n.schema)
    out.push(n.schema === "true" ? "response shape matches its contract again" : n.schema === "false" ? "response shape no longer matches its documented contract" : "schema check unavailable");
  if (p.tools !== n.tools) out.push("advertised tool list changed (names, descriptions or input schemas)");
  return out;
}

/** Called after each probe. Never throws. */
export async function notifyWatchers(
  admin: { from: (t: string) => any },
  entry: { id: string; slug: string; name: string },
  snap: WatchSnapshot,
): Promise<void> {
  try {
    const { data: watches } = await admin
      .from("tool_watches")
      .select("id, email, webhook_url, unsubscribe_token, last_state")
      .eq("entry_id", entry.id);
    if (!watches?.length) return;
    const state = await watchState(snap);
    for (const w of watches) {
      if (w.last_state === state) continue;
      if (w.last_state == null) {
        await admin.from("tool_watches").update({ last_state: state }).eq("id", w.id);
        continue;
      }
      const changes = describeChange(w.last_state, state);
      const payload = {
        event: "tool.changed",
        slug: entry.slug,
        name: entry.name,
        changes,
        previous_state: w.last_state,
        state,
        health_card: `https://agentnexus.app/api/public/health-card/${entry.slug}`,
        entry_url: `https://agentnexus.app/registry/${entry.slug}`,
        observed_at: new Date().toISOString(),
      };
      try {
        if (w.webhook_url) {
          await fetch(w.webhook_url, {
            method: "POST",
            headers: { "content-type": "application/json", "user-agent": "AgentNexus-Watch/1.0" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000),
          });
        }
        if (w.email) {
          const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
          await sendTemplateEmail("tool-change-alert", w.email, {
            idempotencyKey: `watch:${w.id}:${state}`,
            templateData: {
              entryName: entry.name,
              changes,
              entryUrl: payload.entry_url,
              unsubscribeUrl: `https://agentnexus.app/api/public/watch?unsubscribe=${w.unsubscribe_token}`,
            },
          });
        }
      } catch (error) {
        console.error("watch delivery failed", error);
      }
      await admin
        .from("tool_watches")
        .update({ last_state: state, last_notified_at: new Date().toISOString() })
        .eq("id", w.id);
    }
  } catch (error) {
    console.error("notifyWatchers failed", error);
  }
}
