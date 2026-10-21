export const PURCHASE_PRICES = ["agent_pro_monthly", "publisher_monthly"] as const;
export type PurchasePrice = (typeof PURCHASE_PRICES)[number];

export function purchasePrice(value: unknown): PurchasePrice | undefined {
  return PURCHASE_PRICES.find((price) => price === value);
}

export function purchaseReturnPath(price: string): string {
  const valid = purchasePrice(price);
  if (!valid) throw new Error("Unknown subscription plan.");
  return `/pricing?plan=${valid}`;
}

export function purchaseIdentity(user: { id: string; email?: string | undefined } | null) {
  if (!user?.id) throw new Error("Sign in or create an account before subscribing.");
  return { customerEmail: user.email, customData: { userId: user.id } };
}