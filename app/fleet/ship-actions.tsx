"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShipAction, deleteShipAction } from "@/lib/actions/fleet";
import type { FleetShipRow } from "@/lib/queries/fleet";
import { MfdPanel } from "@/components/ui/mfd";

interface ShipActionsProps {
  ship: FleetShipRow;
}

export function ShipActions({ ship }: ShipActionsProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Edit form state
  const [shipName, setShipName] = useState(ship.shipName);
  const [manufacturer, setManufacturer] = useState(ship.manufacturer ?? "");
  const [quantity, setQuantity] = useState(ship.quantity);
  const [isPublic, setIsPublic] = useState(ship.isPublic);
  const [notes, setNotes] = useState(ship.notes ?? "");
  const [imageUrl, setImageUrl] = useState(ship.imageUrl ?? "");

  function openEdit() {
    setShipName(ship.shipName);
    setManufacturer(ship.manufacturer ?? "");
    setQuantity(ship.quantity);
    setIsPublic(ship.isPublic);
    setNotes(ship.notes ?? "");
    setImageUrl(ship.imageUrl ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSave(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawShipName = String(formData.get("shipName") ?? "").trim();
    const rawManufacturer = String(formData.get("manufacturer") ?? "").trim();
    const rawQuantity = Number(formData.get("quantity") ?? 1);
    const rawIsPublic = formData.get("isPublic") === "on";
    const rawNotes = String(formData.get("notes") ?? "").trim();
    const rawImageUrl = String(formData.get("imageUrl") ?? "").trim();

    if (!rawShipName) {
      setError("Ship name is required.");
      return;
    }
    if (rawQuantity < 1 || !Number.isInteger(rawQuantity)) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    startTransition(async () => {
      const r = await updateShipAction(ship.id, {
        shipName: rawShipName,
        manufacturer: rawManufacturer || null,
        quantity: rawQuantity,
        isPublic: rawIsPublic,
        notes: rawNotes || null,
        imageUrl: rawImageUrl || null,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${ship.shipName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const r = await deleteShipAction(ship.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <MfdPanel
        chassis="neutral"
        title={<span>[ EDIT SHIP ]</span>}
        bodyPadding="md"
        className="mt-2"
      >
        <form action={handleSave} className="flex flex-wrap gap-3 items-end">
          {error && <p className="w-full text-sm text-fg-red-light">{error}</p>}

          <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
            <span className="mfd-label">SHIP NAME</span>
            <input
              name="shipName"
              type="text"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              disabled={pending}
              maxLength={200}
              className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm flex-1 min-w-36">
            <span className="mfd-label">MANUFACTURER</span>
            <input
              name="manufacturer"
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              disabled={pending}
              maxLength={200}
              className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm w-20">
            <span className="mfd-label">QTY</span>
            <input
              name="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={pending}
              className="border border-border-light bg-surface px-3 py-2 text-sm font-mono text-amber disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
            <span className="mfd-label">IMAGE URL</span>
            <input
              name="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={pending}
              maxLength={500}
              className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
            <span className="mfd-label">NOTES</span>
            <input
              name="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              maxLength={1000}
              className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
            />
          </label>

          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              name="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={pending}
              className="disabled:opacity-50"
            />
            <span className="mfd-label">PUBLIC</span>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {pending ? "SAVING…" : "SAVE"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="border border-border-light px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </MfdPanel>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <button
        type="button"
        onClick={openEdit}
        disabled={pending}
        className="border border-border-light px-3 py-1 text-xs text-text-secondary hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
      >
        <span className="mfd-label">EDIT</span>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="border border-danger px-3 py-1 text-xs text-fg-red-light hover:bg-danger/10 disabled:opacity-50 transition-colors"
      >
        <span className="mfd-label">{pending ? "DELETING…" : "DELETE"}</span>
      </button>
    </div>
  );
}
