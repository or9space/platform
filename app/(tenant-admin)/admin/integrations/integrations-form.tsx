"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateIntegrationsAction } from "@/lib/actions/tenant-config";

interface IntegrationsFormProps {
  tenantId: string;
  initial: {
    discordGuildId: string;
    calendarId: string;
    botTokenSet: boolean;
  };
  canSetToken: boolean;
}

export function IntegrationsForm({ tenantId, initial, canSetToken }: IntegrationsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [discordGuildId, setDiscordGuildId] = useState(initial.discordGuildId);
  const [calendarId, setCalendarId] = useState(initial.calendarId);
  // Token field always starts empty — the real value is never sent to the client.
  const [discordBotToken, setDiscordBotToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // Omit the token when blank so saving other fields does not wipe an
      // existing token stored on the server.
      const tokenArg = discordBotToken.trim() === "" ? undefined : discordBotToken;
      const result = await updateIntegrationsAction(tenantId, {
        discordGuildId,
        calendarId,
        discordBotToken: tokenArg,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDiscordBotToken("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-base font-medium">Discord</h3>
        <div className="space-y-2">
          <label className="block text-sm text-neutral-400" htmlFor="discordGuildId">
            Guild ID
          </label>
          <input
            id="discordGuildId"
            type="text"
            value={discordGuildId}
            onChange={(e) => setDiscordGuildId(e.target.value)}
            disabled={isPending}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            placeholder="e.g. 123456789012345678"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-neutral-400" htmlFor="discordBotToken">
            Bot Token
          </label>
          <input
            id="discordBotToken"
            type="password"
            value={discordBotToken}
            onChange={(e) => setDiscordBotToken(e.target.value)}
            disabled={isPending || !canSetToken}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-40"
            placeholder={initial.botTokenSet ? "•••• (set)" : ""}
          />
          {!canSetToken && (
            <p className="text-xs text-neutral-500">
              Upgrade to a paid plan to set a bot token.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-medium">Google Calendar</h3>
        <div className="space-y-2">
          <label className="block text-sm text-neutral-400" htmlFor="calendarId">
            Calendar ID
          </label>
          <input
            id="calendarId"
            type="text"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            disabled={isPending}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            placeholder="e.g. your-org@group.calendar.google.com"
          />
        </div>
      </section>

      {error && (
        <p className="rounded border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save integrations"}
      </button>
    </form>
  );
}
