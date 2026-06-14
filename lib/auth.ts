import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prismaGlobal } from "./db";
import { verifyPassword } from "./password";

/**
 * NextAuth 5, JWT sessions, credentials only (Discord OAuth lands in
 * Phase 1.5 with the auth.or9.space broker). Session carries the GLOBAL
 * accountId; per-tenant membership is resolved per request server-side.
 * Cookies are host-only → each tenant subdomain is its own session,
 * which matches the Q13 per-tenant-accounts decision.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const account = await prismaGlobal.account.findUnique({ where: { email } });
        if (!account?.passwordHash) return null;
        const ok = await verifyPassword(password, account.passwordHash);
        if (!ok) return null;
        return { id: account.id, email: account.email, name: account.displayName };
      },
    }),
  ],
  callbacks: {
    /**
     * Keep post-auth redirects on the tenant subdomain the user came from.
     * NEXTAUTH_URL is pinned to the apex (https://or9.space), so Auth.js's
     * default same-origin check rejects a freedomguards.or9.space callbackUrl
     * and bounces to the apex. Allow any or9.space host (apex + subdomains).
     */
    redirect({ url, baseUrl }) {
      try {
        const u = new URL(url, baseUrl);
        if (u.hostname === "or9.space" || u.hostname.endsWith(".or9.space")) {
          return u.toString();
        }
      } catch {
        // fall through to baseUrl on a malformed url
      }
      return baseUrl;
    },
    jwt({ token, user }) {
      if (user?.id) token.accountId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.accountId) (session as any).accountId = token.accountId as string;
      return session;
    },
  },
});

/** Convenience: the signed-in global account id, or null. */
export async function getSessionAccountId(): Promise<string | null> {
  const session = await auth();
  return ((session as any)?.accountId as string | undefined) ?? null;
}
