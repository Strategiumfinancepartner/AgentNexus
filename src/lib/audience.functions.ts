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
          calls: usage?.hits ?? 0,
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
