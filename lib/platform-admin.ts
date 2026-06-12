import { ForbiddenError } from "./permissions";

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Server-side gate for admin.or9.space. Throws ForbiddenError. */
export async function requirePlatformAdmin(): Promise<{ accountId: string; email: string }> {
  const { auth } = await import("./auth");
  const { prismaGlobal } = await import("./db");
  const session = await auth();
  const accountId = (session as any)?.accountId as string | undefined;
  if (!accountId) throw new ForbiddenError("Sign in required");
  const account = await prismaGlobal.account.findUnique({ where: { id: accountId } });
  if (!account || !isPlatformAdminEmail(account.email)) {
    throw new ForbiddenError("Platform admin only");
  }
  return { accountId: account.id, email: account.email };
}
