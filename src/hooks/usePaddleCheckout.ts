import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { supabase } from "@/integrations/supabase/client";
import { purchaseIdentity } from "@/lib/purchase-intent";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    quantity?: number | undefined;
    customerEmail?: string | undefined;
    customData?: Record<string, string> | undefined;
    successUrl?: string | undefined;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw new Error("Please sign in again before subscribing.");
      const identity = purchaseIdentity(data.user ? { id: data.user.id, email: data.user.email } : null);
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: options.quantity ?? 1 }],
        customer: identity.customerEmail ? { email: identity.customerEmail } : undefined,
        customData: { ...options.customData, ...identity.customData },
        settings: {
          displayMode: "overlay",
          successUrl: options.successUrl ?? `${window.location.origin}/pricing?checkout=success`,
          allowLogout: false,
          variant: "one-page",
          showAddDiscounts: true,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
