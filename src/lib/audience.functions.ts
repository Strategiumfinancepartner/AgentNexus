import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertReviewer } from "@/lib/registry-core";

export type MemberRow = {
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  provider: string;
  confirmed: boolean;
  roles: string[];
  keys: number;
  submissions: number;
  plan: "Free" | "Agent Pro" | "Publisher";
};

export type SurfaceRow = { surface: string; hits: number; callers: number; lastSeen: string };

/** One API key, including self-service agent keys minted without any signup. */
export type KeyRow = {
  keyId: string;
  label: string;
  prefix: string;
  kind: "agent" | "user";
  owner: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
  /** Daily call ceiling this key grants: 1 000 (free) or 50 000 (Agent Pro). */
  quota: number;
  calls: number;
  lastCallAt: string | null;
  userAgent: string;
  country: string;
};

export type CallerRow = {
  actor: string;
  tier: string;
  email: string | null;
  hits: number;
  surfaces: string[];
  userAgent: string;
  country: string;
  lastSeen: string;
};

export type McpCallerRow = {
  actor: string;
  hits: number;
  userAgent: string;
  country: string;
  lastSeen: string;
};

export type HitRow = {
  surface: string;
  path: string;
  method: string;
  tier: string;
  actor: string;
  email: string | null;
  userAgent: string;
  country: string;
  createdAt: string;
};

/**
 * Reviewer-only audience report: who signed up, who signed in recently, and
 * which machine-facing surfaces agents actually called.
 */
export const getAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const client = supabaseAdmin as any;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, rolesRes, keysRes, entriesRes, subsRes] = await Promise.all([
      client.auth.admin.listUsers({ page: 1, perPage: 200 }),
      client.from("user_roles").select("user_id, role"),
      client
        .from("api_keys")
        .select(
          "id, user_id, revoked_at, kind, agent_label, key_prefix, created_at, last_used_at, name",
        ),
      client.from("entries").select("submitted_by"),
      client
        .from("subscriptions")
        .select("user_id, product_id, status, current_period_end"),
    ]);

    // PostgREST caps a single response at 1000 rows — page through access_events
    // so the report reflects the real 30-day volume instead of stopping at 1000.
    const PAGE = 1000;
    const MAX_ROWS = 100000;
    const eventsResData: any[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data: page } = await client
        .from("access_events")
        .select("surface, path, method, tier, actor, user_id, user_agent, country, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      const rows = (page ?? []) as any[];
      eventsResData.push(...rows);
      if (rows.length < PAGE) break;
    }
    const eventsRes = { data: eventsResData };

    const users = (usersRes?.data?.users ?? []) as any[];
    const roles = (rolesRes.data ?? []) as { user_id: string; role: string }[];
    const keys = (keysRes.data ?? []) as {
      id: string;
      user_id: string | null;
      revoked_at: string | null;
      kind: string;
      agent_label: string | null;
      key_prefix: string;
      created_at: string;
      last_used_at: string | null;
      name: string | null;
    }[];
    const entries = (entriesRes.data ?? []) as { submitted_by: string | null }[];
    const events = (eventsRes.data ?? []) as {
      surface: string;
      path: string;
      method: string;
      tier: string;
      actor: string;
      user_id: string | null;
      user_agent: string;
      country: string;
      created_at: string;
    }[];

    const emailById = new Map<string, string>();
    for (const u of users) emailById.set(u.id, u.email ?? "(no email)");

    // Paid plan per member. "Free" means an account with no live subscription —
    // the plan a signup lands on by default.
    const subs = (subsRes?.data ?? []) as {
      user_id: string;
      product_id: string;
      status: string;
      current_period_end: string | null;
    }[];
    const planById = new Map<string, "Agent Pro" | "Publisher">();
    for (const s of subs) {
      const live =
        (["active", "trialing", "past_due"].includes(s.status) &&
          (!s.current_period_end || Date.parse(s.current_period_end) > Date.now())) ||
        (s.status === "canceled" &&
          !!s.current_period_end &&
          Date.parse(s.current_period_end) > Date.now());
      if (!live) continue;
      if (s.product_id.startsWith("publisher")) planById.set(s.user_id, "Publisher");
      else if (!planById.has(s.user_id)) planById.set(s.user_id, "Agent Pro");
    }

    const members: MemberRow[] = users
      .map((u) => ({
        plan: planById.get(u.id) ?? ("Free" as const),
        email: u.email ?? "(no email)",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        provider: (u.app_metadata?.provider as string) ?? "email",
        confirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
        roles: roles.filter((r) => r.user_id === u.id).map((r) => r.role),
        keys: keys.filter((k) => k.user_id === u.id && !k.revoked_at).length,
        submissions: entries.filter((e) => e.submitted_by === u.id).length,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const surfaceMap = new Map<string, { hits: number; callers: Set<string>; lastSeen: string }>();
    const callerMap = new Map<
      string,
      {
        tier: string;
        userId: string | null;
        hits: number;
        surfaces: Set<string>;
        userAgent: string;
        country: string;
        lastSeen: string;
      }
    >();

    for (const e of events) {
      const s = surfaceMap.get(e.surface);
      if (s) {
        s.hits += 1;
        s.callers.add(e.actor);
      } else {
        surfaceMap.set(e.surface, {
          hits: 1,
          callers: new Set([e.actor]),
          lastSeen: e.created_at,
        });
      }

      const c = callerMap.get(e.actor);
      if (c) {
        c.hits += 1;
        c.surfaces.add(e.surface);
        if (!c.userAgent && e.user_agent) c.userAgent = e.user_agent;
      } else {
        callerMap.set(e.actor, {
          tier: e.tier,
          userId: e.user_id,
          hits: 1,
          surfaces: new Set([e.surface]),
          userAgent: e.user_agent ?? "",
          country: e.country ?? "",
          lastSeen: e.created_at,
        });
      }
    }

    const surfaces: SurfaceRow[] = [...surfaceMap.entries()]
      .map(([surface, v]) => ({
        surface,
        hits: v.hits,
        callers: v.callers.size,
        lastSeen: v.lastSeen,
      }))
      .sort((a, b) => b.hits - a.hits);

    const callers: CallerRow[] = [...callerMap.entries()]
      .map(([actor, v]) => ({
        actor,
        tier: v.tier,
        email: v.userId ? (emailById.get(v.userId) ?? null) : null,
        hits: v.hits,
        surfaces: [...v.surfaces],
        userAgent: v.userAgent,
        country: v.country,
        lastSeen: v.lastSeen,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 40);

    const recent: HitRow[] = events.slice(0, 60).map((e) => ({
      surface: e.surface,
      path: e.path,
      method: e.method,
      tier: e.tier,
      actor: e.actor,
      email: e.user_id ? (emailById.get(e.user_id) ?? null) : null,
      userAgent: e.user_agent ?? "",
      country: e.country ?? "",
      createdAt: e.created_at,
    }));

    // Lifetime and 30-day call counters: counted server-side so they are never
    // capped by row paging (the paged fetch above stops at MAX_ROWS).
    const { count: hitsAllTimeCount } = await client
      .from("access_events")
      .select("id", { count: "exact", head: true });
    const { count: hits30dCount } = await client
      .from("access_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    const { data: firstRow } = await client
      .from("access_events")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1);
    const hitsAllTime = Number(hitsAllTimeCount ?? 0);
    const firstCallAt = (firstRow?.[0]?.created_at as string | undefined) ?? null;

    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const hitsLast24h = events.filter((e) => now - Date.parse(e.created_at) < day).length;
    const mcp24h = events.filter(
      (e) => e.surface === "mcp" && now - Date.parse(e.created_at) < day,
    );
    const anonMcpMap = new Map<string, McpCallerRow>();
    for (const e of mcp24h) {
      if (e.tier !== "anon" || !e.actor.startsWith("ip:")) continue;
      const current = anonMcpMap.get(e.actor);
      if (current) {
        current.hits += 1;
        if (!current.userAgent && e.user_agent) current.userAgent = e.user_agent;
      } else {
        anonMcpMap.set(e.actor, {
          actor: e.actor,
          hits: 1,
          userAgent: e.user_agent ?? "",
          country: e.country ?? "",
          lastSeen: e.created_at,
        });
      }
    }
    const topAnonMcp = [...anonMcpMap.values()].sort((a, b) => b.hits - a.hits).slice(0, 15);
    const signupsLast7d = members.filter((m) => now - Date.parse(m.createdAt) < 7 * day).length;
    const activeLast7d = members.filter(
      (m) => m.lastSignInAt && now - Date.parse(m.lastSignInAt) < 7 * day,
    ).length;

    // Every key ever minted, with its measured usage. Agent keys carry no
    // account: they are the only way a machine gets 1 000 calls/day.
    // The quota counter (api_usage) sees every keyed call, including ones the
    // access log files under the caller's address (e.g. some MCP handshakes).
    const quotaCalls = new Map<string, number>();
    {
      const { data: usageRows } = await client
        .from("api_usage")
        .select("actor, calls")
        .like("actor", "key:%")
        .gte("day", since.slice(0, 10));
      for (const r of (usageRows ?? []) as { actor: string; calls: number }[]) {
        quotaCalls.set(r.actor, (quotaCalls.get(r.actor) ?? 0) + Number(r.calls ?? 0));
      }
    }
    const keyRows: KeyRow[] = keys
      .map((k) => {
        const usage = callerMap.get(`key:${k.id}`);
        return {
          keyId: k.id,
          label: (k.agent_label || k.name || "default").trim(),
          prefix: k.key_prefix,
          kind: (k.kind === "agent" ? "agent" : "user") as "agent" | "user",
          owner: k.user_id ? (emailById.get(k.user_id) ?? k.user_id) : null,
          createdAt: k.created_at,
          lastUsedAt: k.last_used_at,
          revoked: Boolean(k.revoked_at),
          quota: k.user_id && planById.get(k.user_id) === "Agent Pro" ? 50_000 : 1_000,
          calls: Math.max(usage?.hits ?? 0, quotaCalls.get(`key:${k.id}`) ?? 0),
          lastCallAt: usage?.lastSeen ?? null,
          userAgent: usage?.userAgent ?? "",
          country: usage?.country ?? "",
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      totals: {
        members: members.length,
        signupsLast7d,
        activeLast7d,
        hits30d: Number(hits30dCount ?? events.length),
        hitsLast24h,
        mcpCalls24h: mcp24h.length,
        anonMcpCalls24h: mcp24h.filter((e) => e.tier === "anon").length,
        keyedMcpCalls24h: mcp24h.filter((e) => e.tier !== "anon").length,
        hitsAllTime,
        firstCallAt,
        distinctCallers: callerMap.size,
      },
      members: members.slice(0, 100),
      keys: keyRows,
      surfaces,
      callers,
      topAnonMcp,
      recent,
    };
  });

export type SegmentRow = {
  segment: string;
  label: string;
  callers: number;
  returning: number;
  calls: number;
  mcp: number;
  searches: number;
  entries: number;
  health: number;
  reports: number;
  submits: number;
  catalog: number;
  submissionStatus: number;
  keyed: number;
  mcpConnect: number;
  mcpToolsList: number;
  mcpSearches: number;
  mcpEntries: number;
  mcpOtherTools: number;
  mcpSearchers: number;
  http: number;
  httpCallers: number;
  httpSearchers: number;
  httpEntryOpeners: number;
};

/** Reviewer-only: 30-day traffic split by caller segment (monitors never mixed with users). */
export const getSegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertReviewer(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { classifyCaller, actionOf, mcpActionOf, SEGMENT_LABELS } = await import("@/lib/segments");
    const client = supabaseAdmin as any;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // Actual authenticated submitters are established from entry ownership,
    // never from visits to the public moderation-status endpoint.
    const { data: submitted } = await client.from("entries").select("submitted_by").not("submitted_by", "is", null);
    const publisherUsers = new Set((submitted ?? []).map((e: { submitted_by: string }) => e.submitted_by));
    type Agg = { ua: string; surfaces: Set<string>; days: Set<string>; acts: Record<string, number>; calls: number; keyed: number };
    const actors = new Map<string, Agg>();
    let firstMcpOpAt: string | null = null;
    for (let from = 0; from < 300000; from += 1000) {
      const { data } = await client
        .from("access_events")
        .select("actor, surface, path, user_agent, api_key_id, user_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + 999);
      const rows = (data ?? []) as any[];
      for (const r of rows) {
        let a = actors.get(r.actor);
        if (!a) actors.set(r.actor, (a = { ua: r.user_agent ?? "", surfaces: new Set(), days: new Set(), acts: {}, calls: 0, keyed: 0 }));
        a.surfaces.add(r.surface);
        if (r.user_id && publisherUsers.has(r.user_id)) a.surfaces.add("submitted_entry");
        a.days.add(String(r.created_at).slice(0, 10));
        const act = actionOf(r.surface);
        a.acts[act] = (a.acts[act] ?? 0) + 1;
        if (act === "mcp") {
          const m = `mcp_${mcpActionOf(r.path)}`;
          a.acts[m] = (a.acts[m] ?? 0) + 1;
          if (String(r.path ?? "").includes("#") && (!firstMcpOpAt || r.created_at < firstMcpOpAt)) firstMcpOpAt = r.created_at;
        }
        a.calls++;
        if (r.api_key_id) a.keyed++;
      }
      if (rows.length < 1000) break;
    }
    const out = new Map<string, SegmentRow>();
    for (const a of actors.values()) {
      const seg = classifyCaller(a.ua, a.surfaces);
      let s = out.get(seg);
      if (!s)
        out.set(seg, (s = { segment: seg, label: SEGMENT_LABELS[seg], callers: 0, returning: 0, calls: 0, mcp: 0, searches: 0, entries: 0, health: 0, reports: 0, submits: 0, catalog: 0, submissionStatus: 0, keyed: 0, mcpConnect: 0, mcpToolsList: 0, mcpSearches: 0, mcpEntries: 0, mcpOtherTools: 0, mcpSearchers: 0, http: 0, httpCallers: 0, httpSearchers: 0, httpEntryOpeners: 0 }));
      s.callers++;
      if (a.days.size >= 2) s.returning++;
      s.calls += a.calls;
      s.mcp += a.acts["mcp"] ?? 0;
      s.searches += a.acts["search"] ?? 0;
      s.entries += a.acts["entry"] ?? 0;
      s.health += a.acts["health"] ?? 0;
      s.reports += a.acts["report"] ?? 0;
      s.submits += a.acts["submit"] ?? 0;
      s.catalog += a.acts["catalog"] ?? 0;
      s.submissionStatus += a.acts["submission_status"] ?? 0;
      s.keyed += a.keyed;
      s.mcpConnect += a.acts["mcp_connect"] ?? 0;
      s.mcpToolsList += a.acts["mcp_tools_list"] ?? 0;
      s.mcpSearches += a.acts["mcp_search"] ?? 0;
      s.mcpEntries += a.acts["mcp_entry"] ?? 0;
      s.mcpOtherTools += (a.acts["mcp_other_tool"] ?? 0) + (a.acts["mcp_submit"] ?? 0);
      if ((a.acts["mcp_search"] ?? 0) > 0) s.mcpSearchers++;
      const http = a.calls - (a.acts["mcp"] ?? 0);
      s.http += http;
      if (http > 0) s.httpCallers++;
      if ((a.acts["search"] ?? 0) > 0) s.httpSearchers++;
      if ((a.acts["entry"] ?? 0) > 0) s.httpEntryOpeners++;
    }
    const { data: watchRows } = await client
      .from("tool_watches")
      .select("id, email, webhook_url, owner, confirmed_at, created_at, last_state, last_notified_at, entries(slug, name)")
      .order("created_at", { ascending: false })
      .limit(200);
    const watchList = ((watchRows ?? []) as any[]).map((w) => ({
      id: w.id as string,
      slug: (w.entries?.slug ?? "?") as string,
      name: (w.entries?.name ?? "?") as string,
      channel: w.webhook_url ? "webhook" : "email",
      recipient: (w.email ?? (w.webhook_url ? String(w.webhook_url).replace(/^https?:\/\//, "").split("/")[0] : w.owner)) as string,
      active: !!w.confirmed_at || (!!w.webhook_url && !w.email),
      confirmedAt: (w.confirmed_at ?? null) as string | null,
      createdAt: w.created_at as string,
      lastState: (w.last_state ?? null) as string | null,
      lastNotifiedAt: (w.last_notified_at ?? null) as string | null,
    }));
    const watches = watchList.filter((w) => w.confirmedAt).length;
    return { rows: [...out.values()].sort((x, y) => y.callers - x.callers), confirmedWatches: watches, watches: watchList, mcpTrackingSince: firstMcpOpAt };
  });
