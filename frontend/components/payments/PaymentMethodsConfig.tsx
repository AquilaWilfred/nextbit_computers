"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PAYMENT_METHOD_LABELS } from "@/constants/pay.constants";
import { PaymentMethodsMap } from "@/types/pay.types";

interface PaymentMethodsConfigProps {
  methods: PaymentMethodsMap;
  toggling: string | null;
  onToggle: (key: string, checked: boolean) => void;
}

export const PaymentMethodsConfig = memo(function PaymentMethodsConfig({
  methods,
  toggling,
  onToggle,
}: PaymentMethodsConfigProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
      <div className="space-y-4">
        {Object.entries(methods).map(([key, enabled]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <p className="font-medium">{PAYMENT_METHOD_LABELS[key] || key}</p>
              <p className="text-sm text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</p>
            </div>
            <Switch
              checked={enabled}
              disabled={toggling === key}
              onCheckedChange={(checked) => onToggle(key, checked)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
});