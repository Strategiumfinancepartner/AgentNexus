/**
 * Publisher plan entitlements, applied automatically.
 *
 * The Publisher plan promises four things on the pricing page: a verified
 * badge earned by a real call test, continuous monitoring, downtime alerts and
 * higher placement. Nothing here is granted by hand — this module runs on every
 * scheduled probe pass (every 6 hours) and reconciles the registry with the
 * live subscription state:
 *
 *  - featured  → true while the submitter has an active Publisher subscription,
 *                false again once it lapses.
 *  - verified  → set once the entry actually passes its capability probe (or,
 *                when it is not capability-probeable, a successful health
 *                probe). Paying does not buy the badge; it buys the test.
 *  - alerts    → one email when a publisher entry goes down, one when it comes
 *                back. Deduped through public.publisher_alerts.
 */

type Admin = {
  from: (table: string) => any;
  auth: { admin: { getUserById: (id: string) => Promise<any> } };
};

const PUBLISHER_PRODUCT = "publisher_plan";

type SubRow = {
  user_id: string;
  product_id: string;
  status: string;
  current_period_end: string | null;
};

function subscriptionIsLive(row: SubRow): boolean {
  const future = !row.current_period_end || Date.parse(row.current_period_end) > Date.now();
  if (["active", "trialing", "past_due"].includes(row.status)) return future;
  // A cancelled plan keeps its benefits until the paid period actually ends.
  return row.status === "canceled" && !!row.current_period_end && future;
}

/** User ids with a live Publisher subscription, in either environment. */
export async function publisherUserIds(admin: Admin): Promise<Set<string>> {
  const { data } = await admin
    .from("subscriptions")
    .select("user_id, product_id, status, current_period_end")
    .eq("product_id", PUBLISHER_PRODUCT);
  const ids = new Set<string>();
  for (const row of ((data ?? []) as SubRow[]).filter(subscriptionIsLive)) ids.add(row.user_id);
  return ids;
}

export type EntitlementSummary = {
  publishers: number;
  featured_granted: number;
  featured_revoked: number;
  verified_granted: number;
  alerts_sent: number;
};

type EntryRow = {
  id: string;
  slug: string;
  name: string;
  submitted_by: string | null;
  featured: boolean;
  verified: boolean;
  health_ok: boolean | null;
  capability_ok: boolean | null;
};

export async function syncPublisherEntitlements(admin: Admin): Promise<EntitlementSummary> {
  const publishers = await publisherUserIds(admin);

  const { data } = await admin
    .from("entries")
    .select("id, slug, name, submitted_by, featured, verified, health_ok, capability_ok")
    .eq("status", "approved");
  const rows = (data ?? []) as EntryRow[];

  let featuredGranted = 0;
  let featuredRevoked = 0;
  let verifiedGranted = 0;

  for (const row of rows) {
    const owned = !!row.submitted_by;
    const isPublisher = owned && publishers.has(row.submitted_by!);
    const update: Record<string, unknown> = {};

    if (isPublisher && !row.featured) {
      update['featured'] = true;
      featuredGranted++;
    }
    // Only ever revoke placement on entries that belong to a member: curated
    // rows with no submitter were featured by a reviewer, not by a plan.
    if (owned && !isPublisher && row.featured) {
      update['featured'] = false;
      featuredRevoked++;
    }
    // Verification is earned by passing a real test, never by paying.
    const passed = row.capability_ok === true || (row.capability_ok === null && row.health_ok === true);
    if (isPublisher && !row.verified && passed) {
      update['verified'] = true;
      update['verified_at'] = new Date().toISOString();
      verifiedGranted++;
    }

    if (Object.keys(update).length > 0) {
      await admin.from("entries").update(update).eq("id", row.id);
    }
  }

  const alerts = await sendDowntimeAlerts(
    admin,
    rows.filter((r) => !!r.submitted_by && publishers.has(r.submitted_by!)),
  );

  return {
    publishers: publishers.size,
    featured_granted: featuredGranted,
    featured_revoked: featuredRevoked,
    verified_granted: verifiedGranted,
    alerts_sent: alerts,
  };
}

/**
 * Emails the publisher when one of their entries goes down, and again when it
 * recovers. The last alert stored per entry decides what still needs sending,
 * so a flapping endpoint cannot spam anyone.
 */
async function sendDowntimeAlerts(admin: Admin, entries: EntryRow[]): Promise<number> {
  let sent = 0;

  for (const entry of entries) {
    if (entry.health_ok === null) continue;
    const kind = entry.health_ok ? "recovered" : "down";

    const { data: last } = await admin
      .from("publisher_alerts")
      .select("kind, sent_at")
      .eq("entry_id", entry.id)
      .order("sent_at", { ascending: false })
      .limit(1);
    const lastKind = (last?.[0]?.kind as string | undefined) ?? null;

    // Nothing changed since the last alert, or it never went down at all.
    if (lastKind === kind) continue;
    if (kind === "recovered" && lastKind !== "down") continue;

    let email = "";
    try {
      const { data: user } = await admin.auth.admin.getUserById(entry.submitted_by!);
      email = (user?.user?.email as string | undefined) ?? "";
    } catch {
      email = "";
    }
    if (!email) continue;

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("publisher-health-alert", email, {
        templateData: {
          entryName: entry.name,
          entrySlug: entry.slug,
          state: kind,
          entryUrl: `https://agentnexus.app/registry/${entry.slug}`,
        },
        idempotencyKey: `alert-${entry.id}-${kind}-${new Date().toISOString().slice(0, 13)}`,
      });
    } catch (error) {
      console.error("publisher alert failed", entry.slug, error);
      continue;
    }

    await admin
      .from("publisher_alerts")
      .insert({ entry_id: entry.id, kind, recipient: email });
    sent++;
  }

  return sent;
}
