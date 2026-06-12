export interface AdProvider {
  kind: "noop" | "house" | "network";
  serve(slot: string, tenantId: string): Promise<{ html: string } | null>;
}

export const noOpAdProvider: AdProvider = {
  kind: "noop",
  serve: async () => null,
};
