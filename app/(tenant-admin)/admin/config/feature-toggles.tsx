"use client";
import { useState, useTransition } from "react";
import { setFeatureFlagAction } from "@/lib/actions/tenant-config";

type Flag = { key: string; label: string; enabled: boolean; tenantEditable: boolean; paidOnly: boolean };

export function FeatureToggles({ tenantId, plan, flags }: { tenantId: string; plan: "FREE" | "PAID"; flags: Flag[] }) {
  const [state, setState] = useState<Record<string, boolean>>(Object.fromEntries(flags.map((f) => [f.key, f.enabled])));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(f: Flag) {
    if (pending) return; setMsg(null);
    const next = !state[f.key];
    start(async () => {
      const r = await setFeatureFlagAction(tenantId, plan, f.key, next);
      if (r.ok) setState((s) => ({ ...s, [f.key]: next })); else setMsg(`${f.label}: ${r.error}`);
    });
  }

  return (
    <div className="space-y-2">
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      {flags.map((f) => {
        const locked = !f.tenantEditable || (f.paidOnly && plan === "FREE");
        return (
          <div key={f.key} className="flex items-center justify-between rounded border border-neutral-800 p-3">
            <span className="text-sm">{f.label}
              {!f.tenantEditable && <span className="ml-2 text-xs text-neutral-500">managed by or9.space</span>}
              {f.paidOnly && plan === "FREE" && <span className="ml-2 text-xs text-amber-400">Paid</span>}
            </span>
            <button disabled={locked || pending} onClick={() => toggle(f)}
              className={`rounded px-3 py-1 text-sm disabled:opacity-40 ${state[f.key] ? "bg-green-700" : "border border-neutral-700"}`}>
              {state[f.key] ? "On" : "Off"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
