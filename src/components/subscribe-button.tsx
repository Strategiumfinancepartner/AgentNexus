import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";

type Props = { priceId: string; label: string };

/** Which product each price belongs to, so we can recognise the current plan. */
const productOfPrice: Record<string, string> = {
  agent_pro_monthly: "agent_pro_plan",
  publisher_monthly: "publisher_plan",
};

/** Opens checkout for a signed-in user; sends anyone else to sign in first. */
export function SubscribeButton({ priceId, label }: Props) {
  const navigate = useNavigate();
  const { openCheckout, loading } = usePaddleCheckout();
  const [user, setUser] = useState<{ id: string; email?: string | undefined } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive || !data.user) return;
      setUser({ id: data.user.id, email: data.user.email ?? undefined });

      // An active plan changes the call to action: no double-buying the same plan.
      const { data: row } = await supabase
        .from("subscriptions")
        .select("product_id, status, current_period_end")
        .eq("user_id", data.user.id)
        .eq("environment", getPaddleEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive || !row) return;
      const live =
        ["active", "trialing", "past_due"].includes(row.status) ||
        (row.status === "canceled" &&
          !!row.current_period_end &&
          Date.parse(row.current_period_end) > Date.now());
      if (live) setCurrentProduct(row.product_id);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isCurrent = !!currentProduct && currentProduct === productOfPrice[priceId];
  const isSwitch = !!currentProduct && !isCurrent;

  const start = async () => {
    setError(null);
    if (!user) {
      navigate({ to: "/auth", search: { next: "/pricing" } });
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

  if (isCurrent) {
    return (
      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Your current plan
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button
        onClick={start}
        disabled={loading}
        className="font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {loading ? "Opening…" : `${isSwitch ? "Switch to this plan" : label} →`}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
