import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { createSubscriptionPortalSession } from "@/utils/payments.functions";

type Row = {
  product_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const planName: Record<string, string> = {
  agent_pro_plan: "Agent Pro",
  publisher_plan: "Publisher",
};

/**
 * Shows the signed-in customer's current plan and opens Paddle's hosted portal
 * so they can cancel or change the payment method themselves.
 */
export function ManageSubscription() {
  const openPortal = useServerFn(createSubscriptionPortalSession);
  const [row, setRow] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("subscriptions")
        .select("product_id, status, current_period_end, cancel_at_period_end")
        .eq("user_id", auth.user.id)
        .eq("environment", getPaddleEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (alive && data) setRow(data as Row);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!row) return null;

  const active = ["active", "trialing", "past_due"].includes(row.status);
  const renews = row.current_period_end
    ? new Date(row.current_period_end).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await openPortal({});
      window.open(session.cancelUrl ?? session.overviewUrl, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The billing portal is unavailable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-14 rounded-2xl border border-border bg-card/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
        Your subscription
      </p>
      <p className="mt-2 text-base font-medium tracking-tight">
        {planName[row.product_id] ?? row.product_id}{" "}
        <span className="text-muted-foreground">— {row.status}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {row.cancel_at_period_end
          ? `Cancellation scheduled. Access continues until ${renews ?? "the end of the period"}.`
          : active && renews
            ? `Renews on ${renews}. Cancel any time — access runs to the end of the period you paid for.`
            : "This subscription is no longer active."}
      </p>
      <button
        onClick={go}
        disabled={busy}
        className="mt-5 font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
      >
        {busy ? "Opening…" : "Manage or cancel subscription →"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
