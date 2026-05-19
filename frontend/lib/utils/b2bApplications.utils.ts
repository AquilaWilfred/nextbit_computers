export function formatDate(dateString: string, format: "short" | "long" = "short"): string {
  const date = new Date(dateString);
  if (format === "short") {
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDocumentKeyFromUrl(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1].split(".")[0];
}