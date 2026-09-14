import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({
  children,
  isAdmin = false,
  hasSubscription = true,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  hasSubscription?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const showPricing = hasSubscription === false;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: "var(--color-primary)" }}
      />
      <div className="relative mx-auto max-w-3xl px-6">
        <header className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-6 py-4 backdrop-blur-xl">
          <Link to="/registry" className="flex items-center gap-2.5 font-mono text-xs tracking-[0.28em] uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus
          </Link>
          <nav className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-widest">
            {showPricing && (
              <Link
                to="/pricing"
                className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground transition-opacity hover:opacity-90"
                activeProps={{ className: "bg-primary text-primary-foreground" }}
              >
                Pricing
              </Link>
            )}
            <Link
              to="/registry"
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              Registry
            </Link>
            <Link
              to="/submit"
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              Submit
            </Link>
            <Link
              to="/keys"
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              Keys
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-primary" }}
              >
                Review
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/signals"
                className="text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-primary" }}
              >
                Signals
              </Link>
            )}

            <button
              onClick={signOut}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          </nav>
        </header>
        {showPricing && (
          <div className="-mx-6 border-b border-primary/20 bg-primary/[0.04] px-6 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              You are on the Free tier.{" "}
              <Link to="/pricing" className="underline underline-offset-4 hover:text-primary-foreground">
                Upgrade →
              </Link>
            </p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function HealthBadge({
  ok,
  checkedAt,
}: {
  ok: boolean | null;
  checkedAt: string | null;
}) {
  if (ok === null || !checkedAt) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        unchecked
      </span>
    );
  }
  const date = new Date(checkedAt).toISOString().slice(0, 10);
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest ${
        ok ? "text-primary" : "text-destructive"
      }`}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${ok ? "bg-primary" : "bg-destructive"}`}
      />
      {ok ? `verified ${date}` : `down ${date}`}
    </span>
  );
}
