import Link from "next/link";

/**
 * Public (logged-out) tenant navbar — ported from the Freedom Guards site.
 * Fixed MFD title bar: logo + split stencil wordmark on the left, Sign In /
 * Enlist on the right. The wordmark splits the brand name into first word
 * (primary) + remainder (cream), matching FG's FREEDOM / GUARDS treatment.
 */
export function TenantPublicNav({
  brandName,
  logoUrl,
}: {
  brandName: string;
  logoUrl?: string | null;
}) {
  const [first, ...rest] = brandName.trim().split(/\s+/);
  const second = rest.join(" ");

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center border-b-2 border-primary/40 bg-surface/95 backdrop-blur-sm">
      <nav className="flex w-full items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src={logoUrl || "/images/branding/logo.png"}
            alt={brandName}
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
          />
          <span className="fg-wordmark">
            <span className="fg-wordmark__free">{first?.toUpperCase()}</span>
            {second && <span className="fg-wordmark__guards">{second.toUpperCase()}</span>}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Sign In
          </Link>
          <Link
            href="/apply"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-fg-cream hover:bg-primary-hover"
          >
            Enlist
          </Link>
        </div>
      </nav>
    </header>
  );
}
