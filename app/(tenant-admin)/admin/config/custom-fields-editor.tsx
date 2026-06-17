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
    <div className="space-y-4">
      {msg && <p className="text-sm text-fg-red-light">{msg}</p>}
      {eligibleTypes.map((t) => {
        const list = defs[t] ?? [];
        return (
          <div key={t} className="rounded border border-border bg-surface px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="mfd-label font-mono">{t}</span>
              <span className="mfd-readout text-xs">{list.length}<span className="text-text-muted">/3</span></span>
            </div>
            {list.length > 0 && (
              <ul className="space-y-1 border-t border-border/40 pt-2">
                {list.map((d) => (
                  <li key={d.key} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary"><code className="text-primary">{d.key}</code> · {d.label} · <span className="text-text-muted">{d.kind}</span></span>
                    <button onClick={() => remove(t, d.key)} disabled={pending} className="mfd-label text-fg-red-light hover:underline disabled:opacity-40">remove</button>
                  </li>
                ))}
              </ul>
            )}
            {list.length < 3 && (
              <form action={(fd) => add(t, fd)} className="flex flex-wrap items-end gap-2 border-t border-border/40 pt-2">
                <input name="key" required placeholder="key" pattern="[a-z][a-z0-9_]{0,30}" className="w-28 rounded border border-border bg-surface-elevated px-2 py-1.5 text-sm text-text-primary" />
                <input name="label" required placeholder="Label" className="w-36 rounded border border-border bg-surface-elevated px-2 py-1.5 text-sm text-text-primary" />
                <select name="kind" className="rounded border border-border bg-surface-elevated px-2 py-1.5 text-sm text-text-primary">
                  <option value="text">text</option><option value="number">number</option><option value="enum">enum</option><option value="datetime">datetime</option>
                </select>
                <button type="submit" disabled={pending} className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-fg-cream hover:bg-primary-hover disabled:opacity-50">Add</button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
