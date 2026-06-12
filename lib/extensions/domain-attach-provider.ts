export interface DomainAttachProvider {
  kind: "noop" | "cf-ssl-for-saas";
  attach(args: { tenantId: string; hostname: string }): Promise<{ status: "pending" | "failed" }>;
  detach(args: { tenantId: string; hostname: string }): Promise<{ ok: boolean }>;
  checkStatus(args: { hostname: string }): Promise<{ status: "pending" | "verifying" | "active" | "failing" }>;
}

export const noOpDomainAttachProvider: DomainAttachProvider = {
  kind: "noop",
  attach: async () => ({ status: "failed" }),
  detach: async () => ({ ok: false }),
  checkStatus: async () => ({ status: "failing" }),
};
