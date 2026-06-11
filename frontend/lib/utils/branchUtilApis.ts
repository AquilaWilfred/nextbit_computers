export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    try {
      const body = JSON.parse(text);
      throw new Error(body?.message || body?.error || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response from ${url}: ${text}`);
  }
}

export function formatCoordinates(lat: string, lng: string): string {
  return `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
}

export function getGoogleMapsUrl(lat: string, lng: string): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}