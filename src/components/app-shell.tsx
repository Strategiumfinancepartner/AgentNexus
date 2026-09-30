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
          <Link to="/registry" className="flex items-center gap-2.5 font-mono text-xs tracking-[0.12em] uppercase">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            Agent Nexus.APP
          </Link>
          <nav className="-mx-6 flex w-screen max-w-full items-center gap-4 overflow-x-auto px-6 font-mono text-[11px] tracking-widest whitespace-nowrap uppercase [scrollbar-width:none] [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
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
            {isAdmin && (
              <Link
                to="/audience"
                className="text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-primary" }}
              >
                Audience
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
        <footer className="mt-16 border-t border-border/60 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href="https://live-vps.sasame.online/observatory/check/?url=https%3A%2F%2Fagentnexus.app%2Fmcp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              title="SaSame MCP Readiness — public observation record for agentnexus.app/mcp"
            >
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              SaSame MCP Readiness
            </a>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
              agentnexus.app
            </span>
          </div>
        </footer>
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
  if (ok === null) {
    // Two very different states were both labelled "unchecked": a row waiting
    // for its first probe, and a row with nothing pingable (a local CLI). Say
    // which one it is.
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        {checkedAt ? "no endpoint to probe" : "awaiting first check"}
      </span>
    );
  }
  const date = checkedAt ? new Date(checkedAt).toISOString().slice(0, 10) : "";
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
