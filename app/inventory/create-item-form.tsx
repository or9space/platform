"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItemAction } from "@/lib/actions/inventory";
import { INVENTORY_CATEGORIES, INVENTORY_KINDS, CATEGORY_LABELS } from "@/lib/inventory";
import type { InventoryCategory, InventoryKind } from "@/lib/inventory";

export function CreateItemForm() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>(INVENTORY_CATEGORIES[0]);
  const [kind, setKind] = useState<InventoryKind>(INVENTORY_KINDS[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawName = String(formData.get("name") ?? "").trim();
    const rawCategory = String(formData.get("category")) as InventoryCategory;
    const rawKind = String(formData.get("kind")) as InventoryKind;
    const rawDescription = String(formData.get("description") ?? "").trim();

    if (!rawName) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      const r = await createItemAction({
        name: rawName,
        category: rawCategory,
        kind: rawKind,
        description: rawDescription || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setName("");
      setCategory(INVENTORY_CATEGORIES[0]);
      setKind(INVENTORY_KINDS[0]);
      setDescription("");
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-border p-4">
      <h2 className="mb-4 font-semibold">Add item</h2>
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-fg-red-light">{error}</p>}
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          Name
          <input
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            placeholder="Item name…"
            maxLength={200}
            className="rounded border border-border-light bg-surface px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as InventoryCategory)}
            disabled={pending}
            className="rounded border border-border-light bg-surface px-3 py-2 disabled:opacity-50"
          >
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Kind
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as InventoryKind)}
            disabled={pending}
            className="rounded border border-border-light bg-surface px-3 py-2 disabled:opacity-50"
          >
            {INVENTORY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "UNIQUE" ? "Unique" : "Fungible"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
          Description
          <input
            name="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            placeholder="Optional description…"
            maxLength={1000}
            className="rounded border border-border-light bg-surface px-3 py-2 disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-fg-cream disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
