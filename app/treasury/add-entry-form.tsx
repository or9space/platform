"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTreasuryEntryAction } from "@/lib/actions/treasury";
import { TREASURY_TYPES, TREASURY_CATEGORIES, CATEGORY_LABELS } from "@/lib/treasury";
import type { TreasuryType, TreasuryCategory } from "@/lib/treasury";

export function AddEntryForm() {
  const [type, setType] = useState<TreasuryType>("INCOME");
  const [category, setCategory] = useState<TreasuryCategory>(TREASURY_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawAmount = Number(formData.get("amount"));
    const rawDescription = String(formData.get("description") ?? "").trim();
    const rawType = String(formData.get("type")) as TreasuryType;
    const rawCategory = String(formData.get("category")) as TreasuryCategory;

    if (!rawAmount || rawAmount < 1) {
      setError("Amount must be at least 1.");
      return;
    }

    startTransition(async () => {
      const r = await createTreasuryEntryAction({
        type: rawType,
        category: rawCategory,
        amount: rawAmount,
        description: rawDescription,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setType("INCOME");
      setCategory(TREASURY_CATEGORIES[0]);
      setAmount("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
      {error && (
        <p className="w-full text-sm text-fg-red-light">{error}</p>
      )}
      <label className="flex flex-col gap-1">
        <span className="mfd-label">TYPE</span>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as TreasuryType)}
          disabled={pending}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
        >
          {TREASURY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "INCOME" ? "Income" : "Expense"}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="mfd-label">CATEGORY</span>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TreasuryCategory)}
          disabled={pending}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
        >
          {TREASURY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="mfd-label">AMOUNT</span>
        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={pending}
          placeholder="0"
          className="mfd-readout w-32 rounded border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
        />
      </label>
      <label className="flex flex-col gap-1 flex-1 min-w-48">
        <span className="mfd-label">DESCRIPTION</span>
        <input
          name="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={pending}
          placeholder="Brief description…"
          maxLength={500}
          className="rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
