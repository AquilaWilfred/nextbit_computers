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
      throw new Error((body as { message?: string }).message || (body as { error?: string }).error || "Request failed");
    } catch {
      throw new Error(text || "Request failed");
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${url}: ${text}`);
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatDateForInput(dateString?: string): string {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split("T")[0];
}