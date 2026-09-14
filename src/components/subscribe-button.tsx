import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";

type Props = { priceId: string; label: string };

/** Opens checkout for a signed-in user; sends anyone else to sign in first. */
export function SubscribeButton({ priceId, label }: Props) {
  const navigate = useNavigate();
  const { openCheckout, loading } = usePaddleCheckout();
  const [user, setUser] = useState<{ id: string; email?: string | undefined } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? undefined });
    });
  }, []);

  const start = async () => {
    setError(null);
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      await openCheckout({
        priceId,
        customerEmail: user.email,
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/pricing?checkout=success`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not be opened.");
    }
  };

  return (
    <div className="mt-6">
      <button
        onClick={start}
        disabled={loading}
        className="font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {loading ? "Opening…" : `${label} →`}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
