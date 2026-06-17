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
        className="mfd-label rounded border border-border-light px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-text-primary transition-colors"
      >
        + NEW HANDBOOK
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-3"
    >
      {error && <p className="text-sm text-fg-red-light">{error}</p>}
      <div className="space-y-2">
        <input
          name="slug"
          required
          placeholder="slug (e.g. onboarding)"
          className="w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none mfd-cut-tl-br"
        />
        <input
          name="title"
          required
          placeholder="Title"
          className="w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none mfd-cut-tl-br"
        />
        <input
          name="subtitle"
          placeholder="Subtitle (optional)"
          className="w-full border border-border-light bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none mfd-cut-tl-br"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="mfd-label rounded border border-primary bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
        >
          {isPending ? "CREATING…" : "CREATE"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="mfd-label rounded border border-border-light px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-text-primary transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
