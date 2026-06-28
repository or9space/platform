"use client";

import { Suspense, useState } from "react";
import type { Route } from "next";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiscordIcon } from "@/components/ui/discord-icon";

export function LoginTerminal({
  logoUrl,
  discordEnabled,
}: {
  logoUrl: string | null;
  discordEnabled: boolean;
}) {
  return (
    <Suspense>
      <LoginForm logoUrl={logoUrl} discordEnabled={discordEnabled} />
    </Suspense>
  );
}

function getSafeCallbackUrl(raw: string | null): string {
  if (!raw) return "/";
  // Only allow relative paths starting with a single slash (block //evil.com)
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

function LoginForm({ logoUrl, discordEnabled }: { logoUrl: string | null; discordEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const logo = logoUrl || "/images/branding/logo.png";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("Email or password is incorrect. Check both and try again.");
      setLoading(false);
    } else if (result?.url) {
      const safeRedirect = getSafeCallbackUrl(new URL(result.url, window.location.origin).pathname);
      router.replace(safeRedirect as Route);
    } else {
      router.replace(callbackUrl as Route);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="absolute inset-0 bg-tactical-grid opacity-20" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md animate-page-enter">
        {/* Boot-up header */}
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <img
              src={logo}
              alt="Sign in"
              width={80}
              height={80}
              className="h-20 w-20 object-contain drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]"
            />
          </div>
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <span className="mfd-label-amber">//</span>
            <span className="mfd-label tracking-[0.2em]">AUTH TERMINAL</span>
            <span className="mfd-label-amber">//</span>
          </div>
          <h1 className="text-stencil text-2xl text-primary">Member Login</h1>
        </div>

        {/* MFD chassis around form */}
        <div className="mfd-frame">
          <div className="mfd-frame-body">
            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
              <span className="mfd-label flex items-center gap-1.5">
                <span className="text-primary">[</span>
                <span>SIGN IN</span>
                <span className="text-primary">]</span>
              </span>
              <span className="mfd-readout text-[10px]">SECURE</span>
            </div>

            <div className="px-5 py-5">
              {discordEnabled && (
                <>
                  <Button
                    variant="secondary"
                    className="mb-4 w-full"
                    onClick={() => signIn("discord", { callbackUrl })}
                  >
                    <DiscordIcon className="h-5 w-5" />
                    Sign in with Discord
                  </Button>

                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-border/60" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-surface px-2 mfd-label">or use credentials</span>
                    </div>
                  </div>
                </>
              )}

              {/* Credentials Login */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-fg-red-light mfd-cut-tl-br">
                    <span className="mfd-label-amber mr-2">[ERR]</span>
                    {error}
                  </div>
                )}
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center mfd-label">
          <Link href="/register" className="text-primary hover:text-primary-hover">
            CREATE ACCOUNT
          </Link>
          <span className="mx-3 text-amber/40">//</span>
          <Link href="/apply" className="text-primary hover:text-primary-hover">
            APPLY TO JOIN
          </Link>
        </p>
      </div>
    </div>
  );
}
