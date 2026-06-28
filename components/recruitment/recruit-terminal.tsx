"use client";

import { useState } from "react";
import { FileText, ChevronRight, Send } from "lucide-react";
import { signIn } from "next-auth/react";
import { DiscordIcon } from "@/components/ui/discord-icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApplyForm } from "@/components/recruitment/recruitment-client";

// Generic SC-crew expectations (the platform targets Star Citizen orgs). Shown
// on every tenant's recruit page; ported from the Freedom Guards site.
const EXPECTATIONS = [
  "We run ops twice weekly. Crew RSVPs within 24 hours.",
  "We promote on observed competence, not on time served.",
  "Multi-crew Star Citizen: combat, mining, cargo, exploration.",
];

export function RecruitTerminal({
  orgName,
  logoUrl,
  discordEnabled,
}: {
  orgName: string;
  logoUrl: string | null;
  discordEnabled: boolean;
}) {
  // With Discord, the form hides behind the "Fill Out Application" reveal.
  // Without it, there's a single join path, so show the form directly.
  const [showForm, setShowForm] = useState(!discordEnabled);
  const logo = logoUrl || "/images/branding/logo.png";

  return (
    <div className="p-3 sm:p-6 animate-page-enter">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="mb-10 text-center">
        <div className="mb-3 flex justify-center">
          <img
            src={logo}
            alt={orgName}
            width={192}
            height={192}
            className="h-32 w-32 sm:h-48 sm:w-48 object-contain drop-shadow-[0_0_12px_rgba(220,38,38,0.4)]"
          />
        </div>
        <div className="mb-1.5 flex items-center justify-center gap-2">
          <span className="mfd-label-amber">//</span>
          <span className="mfd-label tracking-[0.2em]">RECRUITMENT TERMINAL</span>
          <span className="mfd-label-amber">//</span>
        </div>
        <h1 className="text-stencil mb-2 text-4xl text-primary">Enlist</h1>
        <p className="mx-auto max-w-xl text-text-secondary">
          {discordEnabled
            ? "Two ways to join. Pick the one that matches how you want to start."
            : `Submit your application and ${orgName} command staff will review it.`}
        </p>
      </div>

      {/* ── Two-path grid (only when Discord OAuth is configured) ─────────── */}
      {discordEnabled && (
        <div className="mx-auto mb-8 grid max-w-2xl gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-4 bg-info/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/20">
              <DiscordIcon className="h-6 w-6 text-fg-blue" />
            </div>
            <div>
              <h2 className="mb-1 text-lg font-semibold text-text-primary">Sign Up with Discord</h2>
              <p className="text-sm text-text-secondary">
                Fastest. We chat in #recruits and decide together within ~24 hours.
              </p>
            </div>
            <Button
              size="lg"
              variant="primary"
              className="mt-auto w-full"
              onClick={() => signIn("discord", { callbackUrl: "/" })}
            >
              <DiscordIcon className="h-5 w-5" />
              Sign Up with Discord
            </Button>
          </Card>

          <Card className="flex flex-col gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-elevated">
              <FileText className="h-6 w-6 text-text-secondary" />
            </div>
            <div>
              <h2 className="mb-1 text-lg font-semibold text-text-primary">Submit an Application</h2>
              <p className="text-sm text-text-secondary">
                Don&apos;t use Discord? Submit an app and command staff will review.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="mt-auto w-full"
              aria-expanded={showForm}
              aria-controls="application-form"
              onClick={() => setShowForm(true)}
            >
              <Send className="h-4 w-4" />
              Fill Out Application
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      )}

      {/* ── What We Expect ───────────────────────────────────────────────── */}
      <div className="mx-auto mb-8 max-w-2xl">
        <h2 className="text-stencil mb-3 text-xl text-primary">
          <span className="text-primary">[ </span>
          What We Expect
          <span className="text-primary"> ]</span>
        </h2>
        <ul className="space-y-2 border-y border-border/40 py-3">
          {EXPECTATIONS.map((item, i) => (
            <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
              <span className="mfd-readout text-xs pt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Application form ─────────────────────────────────────────────── */}
      <div
        id="application-form"
        aria-hidden={discordEnabled ? !showForm : undefined}
        className={
          discordEnabled
            ? [
                "mx-auto grid max-w-2xl transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                showForm ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              ].join(" ")
            : "mx-auto max-w-2xl"
        }
      >
        <div className={discordEnabled ? "min-h-0 overflow-hidden" : ""}>
          <h2 className="text-stencil mb-6 text-center text-xl text-primary">Enlistment Application</h2>
          <ApplyForm orgName={orgName} />
        </div>
      </div>
    </div>
  );
}
