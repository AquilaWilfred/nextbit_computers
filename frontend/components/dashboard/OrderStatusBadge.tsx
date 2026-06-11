import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_MAP } from "@/constants/dashboard/dashboard.constants";

interface OrderStatusBadgeProps {
  status: string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusInfo = ORDER_STATUS_MAP[status];
  return (
    <Badge className={`text-xs ${statusInfo?.color ?? ""}`}>
      {statusInfo?.label ?? status}
    </Badge>
  );
}