export function formatDate(dateString: string, includeTime = false): string {
  const date = new Date(dateString);
  if (includeTime) {
    return date.toLocaleString();
  }
  return date.toLocaleDateString();
}

export function getRoleBadgeClass(role: string): string {
  if (role === "admin") {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
}