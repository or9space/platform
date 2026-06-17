"use client";
import { useState, useTransition } from "react";
import { setFeatureFlagAction } from "@/lib/actions/tenant-config";
import type { TenantPlan } from "@/lib/db";

type Flag = { key: string; label: string; enabled: boolean; tenantEditable: boolean; paidOnly: boolean };

export function FeatureToggles({ tenantId, plan, flags }: { tenantId: string; plan: TenantPlan; flags: Flag[] }) {
  const [state, setState] = useState<Record<string, boolean>>(Object.fromEntries(flags.map((f) => [f.key, f.enabled])));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(f: Flag) {
    if (pending) return; setMsg(null);
    const next = !state[f.key];
    start(async () => {
      const r = await setFeatureFlagAction(tenantId, f.key, next);
      if (r.ok) setState((s) => ({ ...s, [f.key]: next })); else setMsg(`${f.label}: ${r.error}`);
    });
  }

  return (
    <div className="space-y-2">
      {msg && <p className="text-sm text-fg-red-light">{msg}</p>}
      {flags.map((f) => {
        const locked = !f.tenantEditable || (f.paidOnly && plan === "FREE");
        return (
          <div key={f.key} className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2.5">
            <span className="text-sm text-text-primary">{f.label}
              {!f.tenantEditable && <span className="ml-2 text-xs text-text-muted">managed by or9.space</span>}
              {f.paidOnly && plan === "FREE" && <span className="ml-2 mfd-label text-amber">PAID</span>}
            </span>
            <button disabled={locked || pending} onClick={() => toggle(f)}
              className={`rounded px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${state[f.key] ? "bg-primary text-fg-cream hover:bg-primary-hover" : "border border-border text-text-muted hover:border-primary hover:text-primary"}`}>
              {state[f.key] ? "ON" : "OFF"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
