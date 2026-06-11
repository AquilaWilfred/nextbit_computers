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
    credentials: "include",
    ...options,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    try {
      const body = JSON.parse(text);
      throw new Error(body?.message ?? body?.error ?? `Request failed: ${res.status}`);
    } catch {
      throw new Error(text || `Request failed: ${res.status}`);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${url}: ${text}`);
  }
}

export function getRootCategories(categories: Category[]): Category[] {
  return [...categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((c) => !c.parentId);
}

export function getSubCategories(categories: Category[], parentId: number): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}