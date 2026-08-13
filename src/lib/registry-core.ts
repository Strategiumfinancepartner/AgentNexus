import { z } from "zod";

export const CATEGORIES = ["api", "mcp", "cli"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Entry = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  summary: string;
  description: string;
  auth_mode: string;
  endpoint: string;
  docs_url: string | null;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  submitted_by: string | null;
  review_note: string | null;
  health_ok: boolean | null;
  health_status_code: number | null;
  health_latency_ms: number | null;
  health_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export const ENTRY_COLUMNS =
  "id, slug, name, category, summary, description, auth_mode, endpoint, docs_url, tags, status, submitted_by, review_note, health_ok, health_status_code, health_latency_ms, health_checked_at, created_at, updated_at";


export const listInput = z.object({
  search: z.string().trim().max(120).optional().default(""),
  category: z.enum(["all", ...CATEGORIES]).optional().default("all"),
});


export const submitInput = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.enum(CATEGORIES),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().max(4000).optional().default(""),
  auth_mode: z.string().trim().min(1).max(120),
  endpoint: z.string().trim().min(1).max(500),
  docs_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().default([]),
});

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}


export async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}

