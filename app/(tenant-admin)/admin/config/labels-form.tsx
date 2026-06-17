"use client";
import { useState, useTransition } from "react";
import { updateLabelsAction } from "@/lib/actions/tenant-config";

const FIELDS: Array<{ name: string; label: string }> = [
  { name: "memberSingular", label: "Member (singular)" },
  { name: "memberPlural", label: "Members (plural)" },
  { name: "branchSingular", label: "Branch (singular)" },
  { name: "branchPlural", label: "Branches (plural)" },
  { name: "handbookNoun", label: "Handbook noun" },
  { name: "currencyCode", label: "Currency code" },
];

export function LabelsForm({ tenantId, initial }: { tenantId: string; initial: Record<string, string> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function submit(fd: FormData) {
    if (pending) return; setMsg(null);
    start(async () => {
      const input: Record<string, string> = {};
      for (const f of FIELDS) input[f.name] = String(fd.get(f.name) ?? "");
      const r = await updateLabelsAction(tenantId, input);
      setMsg(r.ok ? "Saved." : r.error);
    });
  }
  return (
    <form action={submit} className="space-y-4">
      {msg && <p className="text-sm text-text-secondary">{msg}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="mfd-label block mb-1">{f.label}</label>
            <input name={f.name} defaultValue={initial[f.name] ?? ""} className="w-full rounded border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary" />
          </div>
        ))}
      </div>
      <button type="submit" disabled={pending} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover disabled:opacity-50">{pending ? "Saving…" : "Save labels"}</button>
    </form>
  );
}
