import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { Button } from "@/components/ui/button";
import { purchaseReturnPath } from "@/lib/purchase-intent";

type Props = { priceId: string; label: string; resume?: boolean };

/** Which product each price belongs to, so we can recognise the current plan. */
const productOfPrice: Record<string, string> = {
  agent_pro_monthly: "agent_pro_plan",
  publisher_monthly: "publisher_plan",
};

/** Opens checkout for a signed-in user; sends anyone else to sign in first. */
export function SubscribeButton({ priceId, label, resume = false }: Props) {
  const navigate = useNavigate();
  const { openCheckout, loading } = usePaddleCheckout();
  const [user, setUser] = useState<{ id: string; email?: string | undefined } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const resumed = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (alive) setReady(true);
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
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      navigate({ to: "/auth", search: { next: purchaseReturnPath(priceId) } });
      return;
    }
    try {
      await openCheckout({
        priceId,
        customerEmail: data.user.email,
        customData: { userId: data.user.id },
        successUrl: `${window.location.origin}/keys?welcome=1`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not be opened.");
    }
  };

  useEffect(() => {
    if (!resume || !ready || resumed.current) return;
    resumed.current = true;
    void start();
    // A purchase intent is resumed once; failures remain retryable via the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, ready]);

  if (isCurrent) {
    return (
      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Your current plan
      </p>
    );
  }

  return (
    <div className="mt-6">
      <Button
        variant="link"
        onClick={start}
        disabled={loading || !ready}
        className="h-auto whitespace-normal px-0 font-mono text-[11px] uppercase tracking-widest"
      >
        {loading ? "Opening…" : `${isSwitch ? "Switch to this plan" : label} →`}
      </Button>
      {user?.email && <p className="mt-2 break-all text-[11px] text-muted-foreground">Account: {user.email}</p>}
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
