// lib/utils/image-utils.ts

export function parseImages(raw: any): string[] {
  try {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      const out: string[] = [];
      for (const item of raw) {
        if (!item) continue;
        if (typeof item === "string") out.push(item);
        else if (typeof item === "object") {
          const url = item.url || item.src || item.path || item.filename;
          if (typeof url === "string" && url) out.push(url);
        }
      }
      return out;
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return parseImages(parsed as any);
      } catch {
        return [];
      }
    }
  } catch {
    return [];
  }
  return [];
}