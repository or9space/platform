export interface BillingProvider {
  kind: "noop" | "stripe";
  createCheckoutSession(args: { tenantId: string; priceId: string }): Promise<{ url: string } | null>;
  cancelSubscription(args: { tenantId: string }): Promise<{ ok: boolean }>;
}

export const noOpBillingProvider: BillingProvider = {
  kind: "noop",
  createCheckoutSession: async () => null,
  cancelSubscription: async () => ({ ok: false }),
};
