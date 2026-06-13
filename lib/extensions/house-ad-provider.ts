import type { AdProvider } from "./ad-provider";

/**
 * Open-core default ad provider. Serves a static house ad promoting an upgrade
 * to remove ads. The real ad-network provider lives in the private platform-paid
 * overlay and registers itself on `ext` at module-load, overriding this.
 */
export const houseAdProvider: AdProvider = {
  kind: "house",
  serve: async (_slot: string) => {
    // Static, self-authored HTML (no user input) — safe to render.
    return {
      html: `<div class="rounded border border-neutral-800 bg-neutral-900 p-4 text-center text-sm">
        <p class="text-neutral-300">This org is on the free plan.</p>
        <a href="/pricing" class="mt-2 inline-block text-amber-400 underline">Upgrade to remove ads</a>
      </div>`,
    };
  },
};
