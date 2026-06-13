"use client";
import { useState, useTransition } from "react";
import { upsertCustomFieldDefAction, deleteCustomFieldDefAction } from "@/lib/actions/tenant-config";

type Def = { key: string; label: string; kind: string };

export function CustomFieldsEditor({ tenantId, eligibleTypes, defs }: { tenantId: string; eligibleTypes: string[]; defs: Record<string, Def[]> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(typeName: string, fd: FormData) {
    if (pending) return; setMsg(null);
    start(async () => {
      const r = await upsertCustomFieldDefAction(tenantId, typeName, {
        key: String(fd.get("key") ?? ""), label: String(fd.get("label") ?? ""), kind: String(fd.get("kind") ?? "text"),
      });
      if (!r.ok) setMsg(`${typeName}: ${r.error}`); else window.location.reload();
    });
  }
  function remove(typeName: string, key: string) {
    if (pending) return;
    start(async () => { await deleteCustomFieldDefAction(tenantId, typeName, key); window.location.reload(); });
  }

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      {eligibleTypes.map((t) => {
        const list = defs[t] ?? [];
        return (
          <div key={t} className="rounded border border-neutral-800 p-3">
            <p className="mb-2 font-mono text-sm text-neutral-300">{t} <span className="text-neutral-500">({list.length}/3)</span></p>
            <ul className="mb-2 space-y-1">
              {list.map((d) => (
                <li key={d.key} className="flex items-center justify-between text-sm">
                  <span><code>{d.key}</code> · {d.label} · {d.kind}</span>
                  <button onClick={() => remove(t, d.key)} disabled={pending} className="text-xs text-red-400 hover:underline disabled:opacity-40">remove</button>
                </li>
              ))}
            </ul>
            {list.length < 3 && (
              <form action={(fd) => add(t, fd)} className="flex flex-wrap items-end gap-2">
                <input name="key" required placeholder="key" pattern="[a-z][a-z0-9_]{0,30}" className="w-28 rounded border border-neutral-700 bg-neutral-900 p-1.5 text-sm" />
                <input name="label" required placeholder="Label" className="w-36 rounded border border-neutral-700 bg-neutral-900 p-1.5 text-sm" />
                <select name="kind" className="rounded border border-neutral-700 bg-neutral-900 p-1.5 text-sm">
                  <option value="text">text</option><option value="number">number</option><option value="enum">enum</option><option value="datetime">datetime</option>
                </select>
                <button type="submit" disabled={pending} className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-semibold text-neutral-900 disabled:opacity-50">Add</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
