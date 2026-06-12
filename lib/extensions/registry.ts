import { type AdProvider, noOpAdProvider } from "./ad-provider";
import { type BillingProvider, noOpBillingProvider } from "./billing-provider";
import { type DomainAttachProvider, noOpDomainAttachProvider } from "./domain-attach-provider";

type Slots = {
  adProvider: AdProvider;
  billingProvider: BillingProvider;
  domainAttachProvider: DomainAttachProvider;
};

export class ExtensionRegistry {
  adProvider: AdProvider = noOpAdProvider;
  billingProvider: BillingProvider = noOpBillingProvider;
  domainAttachProvider: DomainAttachProvider = noOpDomainAttachProvider;

  register<K extends keyof Slots>(slot: K, impl: Slots[K]): void {
    (this as Slots)[slot] = impl;
  }

  isExtended(): boolean {
    return this.adProvider.kind !== "noop"
        || this.billingProvider.kind !== "noop"
        || this.domainAttachProvider.kind !== "noop";
  }
}

/** Singleton consumed by app code. platform-paid registers real impls here. */
export const ext = new ExtensionRegistry();
