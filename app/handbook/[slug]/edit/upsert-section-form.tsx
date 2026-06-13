"use client";

import { useTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertSectionAction } from "@/lib/actions/handbook";

interface Props {
  handbookId: string;
  sectionId?: string;
}

export function UpsertSectionForm({ handbookId, sectionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const title = (data.get("title") as string).trim();
    const body = (data.get("body") as string);
    const orderIndex = parseInt(data.get("orderIndex") as string, 10);

    setError(null);
    startTransition(async () => {
      const result = await upsertSectionAction({
        handbookId,
        sectionId,
        title,
        body,
        orderIndex,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <input
        name="title"
        required
        placeholder="Section title"
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <textarea
        name="body"
        required
        rows={6}
        placeholder="Section body…"
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <input
        name="orderIndex"
        type="number"
        required
        defaultValue={0}
        placeholder="Order index"
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-neutral-600 px-4 py-2 text-sm hover:border-neutral-400 disabled:opacity-50"
      >
        {isPending ? "Saving…" : sectionId ? "Update Section" : "Add Section"}
      </button>
    </form>
  );
}
