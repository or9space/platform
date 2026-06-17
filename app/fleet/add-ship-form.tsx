"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addShipAction } from "@/lib/actions/fleet";
import { MfdPanel } from "@/components/ui/mfd";

export function AddShipForm() {
  const [shipName, setShipName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (pending) return;
    setError(null);

    const rawShipName = String(formData.get("shipName") ?? "").trim();
    const rawManufacturer = String(formData.get("manufacturer") ?? "").trim();
    const rawImageUrl = String(formData.get("imageUrl") ?? "").trim();
    const rawNotes = String(formData.get("notes") ?? "").trim();
    const rawQuantity = Number(formData.get("quantity") ?? 1);
    const rawIsPublic = formData.get("isPublic") === "on";

    if (!rawShipName) {
      setError("Ship name is required.");
      return;
    }
    if (rawQuantity < 1 || !Number.isInteger(rawQuantity)) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }

    startTransition(async () => {
      const r = await addShipAction({
        shipName: rawShipName,
        manufacturer: rawManufacturer || undefined,
        imageUrl: rawImageUrl || undefined,
        notes: rawNotes || undefined,
        quantity: rawQuantity,
        isPublic: rawIsPublic,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setShipName("");
      setManufacturer("");
      setImageUrl("");
      setNotes("");
      setQuantity(1);
      setIsPublic(true);
      router.refresh();
    });
  }

  return (
    <MfdPanel
      chassis="neutral"
      title={<span>[ REGISTER SHIP ]</span>}
      bodyPadding="md"
    >
      <form action={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {error && <p className="w-full text-sm text-fg-red-light">{error}</p>}

        <label className="flex flex-col gap-1 text-sm flex-1 min-w-40">
          <span className="mfd-label">SHIP NAME</span>
          <input
            name="shipName"
            type="text"
            value={shipName}
            onChange={(e) => setShipName(e.target.value)}
            disabled={pending}
            placeholder="e.g. Constellation Andromeda…"
            maxLength={200}
            className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50"
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
            placeholder="e.g. RSI…"
            maxLength={200}
            className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50"
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
            placeholder="https://…"
            maxLength={500}
            className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50"
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
            placeholder="Optional notes…"
            maxLength={1000}
            className="border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50"
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

        <button
          type="submit"
          disabled={pending}
          className="bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {pending ? "ADDING…" : "ADD SHIP"}
        </button>
      </form>
    </MfdPanel>
  );
}
