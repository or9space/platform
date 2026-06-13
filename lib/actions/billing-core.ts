import { guardCommand } from "./tenant-config-core";
import { ext } from "../extensions/registry";

type Result<T extends Record<string, unknown> = Record<string, unknown>> =
  | ({ ok: true; error?: never } & T)
  | { ok: false; error: string };

export async function startUpgradeCore(
  tenantId: string,
  accountId: string,
  priceId: string,
): Promise<Result<{ url: string }>> {
  const g = await guardCommand(tenantId, accountId);
  if (!g.ok) return g;

  if (ext.billingProvider.kind === "noop") {
    return {
      ok: false,
      error:
        "Hosted billing isn't configured on this deployment. Self-hosting is free, or upgrade on the hosted or9.space.",
    };
  }

  const session = await ext.billingProvider.createCheckoutSession({ tenantId, priceId });
  if (!session) return { ok: false, error: "Could not start checkout — try again." };

  return { ok: true, url: session.url };
}
