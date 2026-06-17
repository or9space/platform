"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/forums";
import { MfdPanel } from "@/components/ui/mfd";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export function CategoryManager({ categories }: { categories: CategoryItem[] }) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, startCreateTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate(formData: FormData) {
    if (createPending) return;
    setCreateError(null);
    const n = String(formData.get("name") ?? "").trim();
    const s = String(formData.get("slug") ?? "").trim();
    const d = String(formData.get("description") ?? "").trim();
    startCreateTransition(async () => {
      const r = await createCategoryAction({ name: n, slug: s, description: d || undefined });
      if (!r.ok) { setCreateError(r.error); return; }
      setName("");
      setSlug("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <MfdPanel
        chassis="neutral"
        title="[ CATEGORIES ]"
        titleAside={<span className="mfd-readout">{categories.length} defined</span>}
        bodyPadding="sm"
      >
        {categories.length === 0 ? (
          <p className="text-sm text-text-secondary py-1">No categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} router={router} />
            ))}
          </ul>
        )}
      </MfdPanel>

      <MfdPanel chassis="primary" title="[ CREATE CATEGORY ]" bodyPadding="md">
        <form action={handleCreate} className="space-y-3">
          {createError && <p className="text-sm text-fg-red-light">{createError}</p>}
          <label className="block text-sm">
            <span className="mfd-label">Name</span>
            <input
              name="name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-border-light bg-surface-elevated px-3 py-2 text-text-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mfd-label">Slug (URL-safe, e.g. general-chat)</span>
            <input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full border border-border-light bg-surface-elevated px-3 py-2 text-text-primary"
            />
          </label>
          <label className="block text-sm">
            <span className="mfd-label">Description (optional)</span>
            <input
              name="description"
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-border-light bg-surface-elevated px-3 py-2 text-text-primary"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="bg-primary px-4 py-2 text-sm font-semibold text-fg-cream hover:bg-primary-hover disabled:opacity-50"
          >
            {createPending ? "Creating…" : "Create category"}
          </button>
        </form>
      </MfdPanel>
    </div>
  );
}

function CategoryRow({
  category,
  router,
}: {
  category: CategoryItem;
  router: ReturnType<typeof useRouter>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteCategoryAction(category.id);
      if (!r.ok) { setError(r.error); return; }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between border border-border bg-surface-elevated px-3 py-2">
      <div>
        <p className="font-medium text-text-primary">{category.name}</p>
        <p className="mfd-label">/forums/{category.slug}</p>
        {category.description && (
          <p className="text-xs text-text-secondary">{category.description}</p>
        )}
        {error && <p className="text-xs text-fg-red-light">{error}</p>}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="border border-border-light px-3 py-1 text-sm text-text-secondary disabled:opacity-50 hover:border-primary hover:text-text-primary"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </li>
  );
}
