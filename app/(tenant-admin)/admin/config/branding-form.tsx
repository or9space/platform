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
    <form action={submit} className="space-y-4">
      {msg && <p className="text-sm text-text-secondary">{msg}</p>}
      <div>
        <label className="mfd-label block mb-1">Org name</label>
        <input name="name" defaultValue={initial.name} className="w-full rounded border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary" />
      </div>
      <div>
        <label className="mfd-label block mb-1">Tagline</label>
        <input name="tagline" defaultValue={initial.tagline ?? ""} className="w-full rounded border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary" />
      </div>
      <div>
        <label className="mfd-label block mb-1">Theme</label>
        <select name="preset" defaultValue={initial.preset} className="w-full rounded border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary">
          <option value="tactical-dark">Tactical Dark</option>
          <option value="tactical-light">Tactical Light</option>
          <option value="racing-red">Racing Red</option>
          <option value="indigo-noir">Indigo Noir</option>
        </select>
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover disabled:opacity-50">{pending ? "Saving…" : "Save branding"}</button>
    </form>
  );
}
