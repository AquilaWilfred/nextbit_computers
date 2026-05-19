// components/StatusBadge.tsx
import { RequestStatus } from "@/types/repairs.types";
import { STATUS_MAP } from "@/constants/repairs.constants";

interface StatusBadgeProps {
  status: RequestStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = STATUS_MAP[status];
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${className}`}>
      {label}
    </span>
  );
}