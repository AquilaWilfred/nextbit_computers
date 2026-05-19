"use client";

import { memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUSES } from "@/constants/orders.constants";
import { formatStatus } from "@/lib/utils/order.utils";

interface OrderStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const OrderStatusSelect = memo(function OrderStatusSelect({
  value,
  onChange,
  disabled,
}: OrderStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {formatStatus(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});