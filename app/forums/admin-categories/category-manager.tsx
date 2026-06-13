"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/forums";

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
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-semibold">Existing categories</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-neutral-400">No categories yet.</p>
        ) : (
          <ul className="space-y-2">
            {categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} router={router} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Create category</h2>
        <form action={handleCreate} className="space-y-3">
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <label className="block text-sm">
            Name
            <input
              name="name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
            />
          </label>
          <label className="block text-sm">
            Slug (URL-safe, e.g. general-chat)
            <input
              name="slug"
              required
              maxLength={100}
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
            />
          </label>
          <label className="block text-sm">
            Description (optional)
            <input
              name="description"
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="rounded bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
          >
            {createPending ? "Creating…" : "Create category"}
          </button>
        </form>
      </section>
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
    <li className="flex items-center justify-between rounded border border-neutral-800 p-3">
      <div>
        <p className="font-medium">{category.name}</p>
        <p className="text-xs text-neutral-500">/forums/{category.slug}</p>
        {category.description && (
          <p className="text-xs text-neutral-400">{category.description}</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="rounded border border-neutral-700 px-3 py-1 text-sm disabled:opacity-50 hover:border-neutral-500"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </li>
  );
}
