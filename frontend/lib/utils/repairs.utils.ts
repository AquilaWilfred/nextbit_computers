// utils/repairs.utils.ts
import { Technician } from "@/types/repairs.types";

export function getTechnicianInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getTechnicianColors(index: number): { bg: string; text: string } {
  const colors = [
    { bg: "#E1F5EE", text: "#0F6E56" },
    { bg: "#E6F1FB", text: "#185FA5" },
    { bg: "#FAEEDA", text: "#854F0B" },
    { bg: "#FBEAF0", text: "#993556" },
  ];
  return colors[index % colors.length];
}

export function filterTechnicians(
  technicians: Technician[],
  searchQuery: string,
  activeSpec: string
): Technician[] {
  return technicians.filter((t) => {
    const matchSpec = activeSpec === "all" || t.specialties.includes(activeSpec);
    const q = searchQuery.toLowerCase();
    const matchQ =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.specialties.some((s) => s.toLowerCase().includes(q));
    return matchSpec && matchQ;
  });
}

export function sortTechnicians(
  technicians: Technician[],
  sortKey: "rating" | "distance" | "price" | "jobs"
): Technician[] {
  return [...technicians].sort((a, b) => {
    switch (sortKey) {
      case "rating":
        return b.rating - a.rating;
      case "distance":
        return a.distanceKm - b.distanceKm;
      case "price":
        return a.minPrice - b.minPrice;
      case "jobs":
        return b.jobsCompleted - a.jobsCompleted;
      default:
        return 0;
    }
  });
}