// components/technician/StatCard.tsx
import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  highlight?: boolean;
  isUpdating?: boolean;  // Add this
}

export function StatCard({ label, value, sub, icon, highlight, isUpdating }: StatCardProps) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "bg-emerald-50 border-emerald-200" : "bg-muted/50 border-transparent"}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {isUpdating && (
            <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
          )}
          <span className={highlight ? "text-emerald-600" : "text-muted-foreground"}>{icon}</span>
        </div>
      </div>
      <div className={`text-xl font-bold ${highlight ? "text-emerald-700" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}