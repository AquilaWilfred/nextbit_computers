"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreditCard } from "lucide-react";
import { PAYMENT_TERMS } from "@/constants/b2b.applications.consntants";

interface CreditTermsFormProps {
  creditLimit: string;
  onCreditLimitChange: (value: string) => void;
  paymentTerms: string;
  onPaymentTermsChange: (value: string) => void;
}

export const CreditTermsForm = memo(function CreditTermsForm({
  creditLimit,
  onCreditLimitChange,
  paymentTerms,
  onPaymentTermsChange,
}: CreditTermsFormProps) {
  return (
    <Card className="p-5 border border-border">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" /> Credit Terms (on approval)
      </h3>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Credit Limit (KES)
          </label>
          <Input
            type="number"
            placeholder="e.g. 500000"
            value={creditLimit}
            onChange={(e) => onCreditLimitChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Payment Terms
          </label>
          <select
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            value={paymentTerms}
            onChange={(e) => onPaymentTermsChange(e.target.value)}
          >
            {Object.entries(PAYMENT_TERMS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
});