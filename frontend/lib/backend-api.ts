const DEFAULT_BACKEND_API_BASE = "http://localhost:8080/api";

export function getBackendApiBase(): string {
  return (
    process.env.NEXTBIT_CATALOGUE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND_API_BASE
  ).replace(/\/$/, "");
}

export async function fetchBackend(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${getBackendApiBase()}${normalizedPath}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
