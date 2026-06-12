/**
 * Support portal layout — chrome only, no auth gate.
 *
 * Layout deviation (documented): the original plan gated all children behind
 * getSessionAccountId() in the layout, which blocked the /login-direct page
 * (unauthenticated users got the "sign in here" wall linking to itself).
 * Fix: the layout renders header + children unconditionally. Auth checks live
 * inside the individual pages (page.tsx + tickets/[ticketId]/page.tsx), which
 * render a sign-in prompt when accountId is null.
 */

import type { ReactNode } from "react";

export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800 p-4">
        <a href="/" className="font-bold">or9.space support</a>
      </header>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
