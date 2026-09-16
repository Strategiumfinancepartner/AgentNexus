import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: "sandbox" | "live" }) => data)
  .handler(async ({ data }) => {
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result = (await response.json()) as { data?: Array<{ id: string }> };
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0]!.id;
  });

type PortalResult = {
  overviewUrl: string;
  cancelUrl: string | null;
  updatePaymentMethodUrl: string | null;
};

/**
 * Creates a Paddle customer portal session for the signed-in user's most
 * recent subscription. The portal is where a customer cancels, updates the
 * card, or downloads invoices — Paddle hosts it, so it always reflects the
 * real billing state.
 */
export const createSubscriptionPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalResult> => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("Could not read your subscription.");
    if (!row?.paddle_customer_id) throw new Error("No subscription found for this account.");

    const { gatewayFetch } = await import("@/lib/paddle.server");

    const env = (row.environment === "live" ? "live" : "sandbox") as "sandbox" | "live";
    const response = await gatewayFetch(
      env,
      `/customers/${row.paddle_customer_id}/portal-sessions`,
      {
        method: "POST",
        body: JSON.stringify(
          row.paddle_subscription_id
            ? { subscription_ids: [row.paddle_subscription_id] }
            : {},
        ),
      },
    );

    if (!response.ok) throw new Error("The billing portal is unavailable right now.");

    const payload = (await response.json()) as {
      data?: {
        urls?: {
          general?: { overview?: string };
          subscriptions?: Array<{
            cancel_subscription?: string;
            update_subscription_payment_method?: string;
          }>;
        };
      };
    };

    const urls = payload.data?.urls;
    const overviewUrl = urls?.general?.overview;
    if (!overviewUrl) throw new Error("The billing portal is unavailable right now.");

    const sub = urls?.subscriptions?.[0];
    return {
      overviewUrl,
      cancelUrl: sub?.cancel_subscription ?? null,
      updatePaymentMethodUrl: sub?.update_subscription_payment_method ?? null,
    };
  });
