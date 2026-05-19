// components/TrustPill.tsx
import { ReactNode } from "react";

interface TrustPillProps {
  icon: ReactNode;
  label: string;
}

export function TrustPill({ icon, label }: TrustPillProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
      {icon}
      {label}
    </div>
  );
}