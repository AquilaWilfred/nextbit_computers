// components/ConditionBadge.tsx
import { PartCondition } from "@/types/repairs.types";
import { CONDITION_MAP } from "@/constants/repairs.constants";

interface ConditionBadgeProps {
  condition: PartCondition;
}

export function ConditionBadge({ condition }: ConditionBadgeProps) {
  const { label, className } = CONDITION_MAP[condition];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}