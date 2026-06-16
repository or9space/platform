"use client";
import { useState, useTransition } from "react";
import { updateBrandingAction } from "@/lib/actions/tenant-config";

export function BrandingForm({ tenantId, initial }: { tenantId: string; initial: { name: string; tagline: string | null; preset: string } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return; setMsg(null);
    start(async () => {
      const r = await updateBrandingAction(tenantId, {
        name: String(fd.get("name") ?? ""),
        tagline: (String(fd.get("tagline") ?? "") || null),
        preset: String(fd.get("preset") ?? "tactical-dark"),
      });
      setMsg(r.ok ? "Saved." : r.error);
    });
  }
  return (
    <form action={submit} className="space-y-3">
      {msg && <p className="text-sm text-text-secondary">{msg}</p>}
      <label className="block text-sm">Org name
        <input name="name" defaultValue={initial.name} className="mt-1 w-full rounded border border-border-light bg-surface p-2" />
      </label>
      <label className="block text-sm">Tagline
        <input name="tagline" defaultValue={initial.tagline ?? ""} className="mt-1 w-full rounded border border-border-light bg-surface p-2" />
      </label>
      <label className="block text-sm">Theme
        <select name="preset" defaultValue={initial.preset} className="mt-1 w-full rounded border border-border-light bg-surface p-2">
          <option value="tactical-dark">Tactical Dark</option>
          <option value="tactical-light">Tactical Light</option>
          <option value="racing-red">Racing Red</option>
          <option value="indigo-noir">Indigo Noir</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50">{pending ? "Saving…" : "Save branding"}</button>
    </form>
  );
}
