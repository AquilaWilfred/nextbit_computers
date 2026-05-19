// components/technician/JobProgressBar.tsx
import { JobStatus } from "@/types/technician.types";
import { STATUS_META } from "@/constants/technician.constants";
import { getJobProgressPercent } from "@/lib/utils/technician.utils";

interface JobProgressBarProps {
  status: JobStatus;
}

export function JobProgressBar({ status }: JobProgressBarProps) {
  const pct = getJobProgressPercent(status);
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{STATUS_META[status].label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}