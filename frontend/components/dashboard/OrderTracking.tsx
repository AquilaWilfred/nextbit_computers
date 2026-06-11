import { CheckCircle, Truck } from "lucide-react";
import { TRACKING_STAGES } from "@/constants/dashboard/dashboard.constants";
import { OrderHistory } from "@/types/dashboard/dashboard.types";
import { OrderStatusBadge } from "./OrderStatusBadge";

interface OrderTrackingProps {
  currentStatus: string;
  history: OrderHistory[];
}

export function OrderTracking({ currentStatus, history }: OrderTrackingProps) {
  const currentStageIndex = TRACKING_STAGES.indexOf(currentStatus);

  return (
    <section className="bg-card border border-border rounded-xl p-5" aria-labelledby="tracking-heading">
      <h2 id="tracking-heading" className="font-display font-semibold mb-5 flex items-center gap-2">
        <Truck className="w-4.5 h-4.5 text-[var(--brand)]" aria-hidden="true" /> Order Tracking
      </h2>
      <div className="relative">
        <ol className="flex justify-between mb-2" aria-label="Order status steps">
          {TRACKING_STAGES.map((stage, i) => (
            <li key={stage} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                  i <= currentStageIndex
                    ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                    : "border-border bg-background"
                }`}
                aria-current={i === currentStageIndex ? "step" : undefined}
              >
                {i < currentStageIndex
                  ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  : <span className="text-[10px] font-bold" aria-hidden="true">{i + 1}</span>}
              </div>
              <span className="text-[10px] text-center text-muted-foreground hidden sm:block leading-tight">
                <OrderStatusBadge status={stage} />
              </span>
            </li>
          ))}
        </ol>
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-border -z-10" aria-hidden="true">
          <div
            className="h-full bg-[var(--brand)] transition-all duration-500"
            style={{ width: `${(Math.max(0, currentStageIndex) / (TRACKING_STAGES.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <ol className="mt-4 space-y-2" aria-label="Order history">
        {history.map((h, i) => (
          <li key={h.id} className="flex gap-2.5 text-sm">
            <div
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === history.length - 1 ? "bg-[var(--brand)]" : "bg-green-500"}`}
              aria-hidden="true"
            />
            <div>
              <span className="font-medium"><OrderStatusBadge status={h.status} /></span>
              {h.note && <span className="text-muted-foreground ml-1.5">— {h.note}</span>}
              <time className="text-xs text-muted-foreground ml-1.5" dateTime={h.createdAt}>
                {new Date(h.createdAt).toLocaleString()}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}