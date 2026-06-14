/**
 * Next.js startup hook. On the HOSTED build (where the private `platform-paid`
 * overlay is present AND Stripe keys are set), this registers the real
 * providers onto the ExtensionRegistry. On OSS / self-host builds the overlay
 * module isn't installed, so the dynamic import throws and is swallowed —
 * the platform keeps its no-op providers.
 *
 * The import specifier is held in a variable so the bundler treats it as fully
 * dynamic and never tries to resolve `platform-paid` at build time (keeping the
 * OSS build green without the overlay).
 */
export async function register() {
  if (!process.env.STRIPE_SECRET_KEY) return; // fail-safe: no keys, no overlay
  try {
    const spec = "platform-paid/src/register";
    const overlay = (await import(/* webpackIgnore: true */ spec)) as {
      registerPaidExtensions: (ext: unknown) => void;
    };
    const { ext } = await import("@/lib/extensions/registry");
    overlay.registerPaidExtensions(ext);
    console.log("[or9] platform-paid overlay registered");
  } catch (e) {
    console.warn("[or9] platform-paid overlay not loaded:", (e as Error).message);
  }
}
