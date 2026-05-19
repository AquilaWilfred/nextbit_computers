export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export function formatCoordinates(lat: string, lng: string): string {
  return `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
}

export function getGoogleMapsUrl(lat: string, lng: string): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}