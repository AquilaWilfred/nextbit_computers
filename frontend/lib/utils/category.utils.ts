import { Category } from "@/types/categories.types";

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getRootCategories(categories: Category[]): Category[] {
  return [...categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((c) => !c.parentId);
}

export function getSubCategories(categories: Category[], parentId: number): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}