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
    <form action={submit} className="space-y-3">
      {msg && <p className="text-sm text-neutral-300">{msg}</p>}
      {FIELDS.map((f) => (
        <label key={f.name} className="block text-sm">{f.label}
          <input name={f.name} defaultValue={initial[f.name] ?? ""} className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2" />
        </label>
      ))}
      <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50">{pending ? "Saving…" : "Save labels"}</button>
    </form>
  );
}
