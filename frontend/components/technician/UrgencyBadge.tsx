// components/technician/UrgencyBadge.tsx
import { Urgency } from "@/types/technician.types";
import { URGENCY_META } from "@/constants/technician.constants";

interface UrgencyBadgeProps {
  urgency: Urgency;
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const m = URGENCY_META[urgency];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${m.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}