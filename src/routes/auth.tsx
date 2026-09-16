import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Mail } from "lucide-react";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.42-3.42A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-foreground" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = typeof s['next'] === "string" ? s['next'] : "";
    // only same-origin relative paths may be resumed after sign-in
    return /^\/(?!\/)/.test(next) ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Agent Nexus" },
      {
        name: "description",
        content:
          "Sign in to Agent Nexus to browse the registry of APIs, MCP servers and CLIs that AI agents call.",
      },
      { property: "og:title", content: "Sign in — Agent Nexus" },
      {
        property: "og:description",
        content: "Access the registry of callable surfaces for AI agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const afterAuth = () => {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/registry", replace: true });
  };
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) afterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next
              ? `${window.location.origin}${next}`
              : window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        afterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        afterAuth();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple" | "microsoft", label: string) {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: next
        ? `${window.location.origin}${next}`
        : window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(`${label} sign-in failed`);
      return;
    }
    if (result.redirected) return;
    afterAuth();
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error("Enter your email address first");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: next
            ? `${window.location.origin}${next}`
            : window.location.origin,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-mono text-xs tracking-[0.28em] uppercase text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          Agent Nexus
        </Link>

        <h1 className="mt-8 text-2xl font-medium tracking-tight">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The registry is reserved for accounts. Sign in to browse and submit callable
          surfaces.
        </p>

        {sent ? (
          <p className="mt-8 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            Check your inbox — open the link we just sent to {email} to continue.
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-8 space-y-3">
              {mode === "signup" && (
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  autoComplete="nickname"
                  maxLength={60}
                  className="h-11 w-full rounded-lg border border-border bg-card/50 px-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-border bg-card/50 px-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ characters)"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="h-11 w-full rounded-lg border border-border bg-card/50 px-3 text-sm outline-hidden placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-2">
              {(
                [
                  ["google", "Google"],
                  ["apple", "Apple"],
                  ["microsoft", "Microsoft"],
                ] as const
              ).map(([provider, label]) => (
                <button
                  key={provider}
                  onClick={() => handleOAuth(provider, label)}
                  disabled={busy}
                  className="h-11 w-full rounded-lg border border-border bg-card/50 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Continue with {label}
                </button>
              ))}
              <button
                onClick={handleMagicLink}
                disabled={busy}
                className="h-11 w-full rounded-lg border border-border bg-card/50 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                Email me a sign-in link
              </button>
            </div>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-6 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {mode === "signin"
                ? "No account yet? Create one"
                : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
