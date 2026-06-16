"use client";

import { useTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createHandbookAction } from "@/lib/actions/handbook";

export function CreateHandbookForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const slug = (data.get("slug") as string).trim();
    const title = (data.get("title") as string).trim();
    const subtitle = (data.get("subtitle") as string).trim() || undefined;

    setError(null);
    startTransition(async () => {
      const result = await createHandbookAction({ slug, title, subtitle });
      if (!result.ok) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary"
      >
        + New Handbook
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded border border-border-light p-4 space-y-3"
    >
      <p className="text-sm font-semibold">New Handbook</p>
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <div className="space-y-2">
        <input
          name="slug"
          required
          placeholder="slug (e.g. onboarding)"
          className="w-full rounded border border-border-light bg-surface px-3 py-2 text-sm"
        />
        <input
          name="title"
          required
          placeholder="Title"
          className="w-full rounded border border-border-light bg-surface px-3 py-2 text-sm"
        />
        <input
          name="subtitle"
          placeholder="Subtitle (optional)"
          className="w-full rounded border border-border-light bg-surface px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded border border-border-light px-4 py-2 text-sm hover:border-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
