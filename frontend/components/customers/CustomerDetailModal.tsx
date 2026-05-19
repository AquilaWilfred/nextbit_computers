"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Customer } from "@/types/customers.types";
import { formatDate } from "@/lib/utils/customer.utils";

interface CustomerDetailModalProps {
  customer: Customer | null;
  isResetting: boolean;
  onClose: () => void;
  onResetPassword: (email: string) => void;
}

export const CustomerDetailModal = memo(function CustomerDetailModal({
  customer,
  isResetting,
  onClose,
  onResetPassword,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  const details: [string, string][] = [
    ["Name", customer.name || "—"],
    ["Email", customer.email],
    ["Phone", customer.phone || "—"],
    ["Role", customer.role],
    ["Member Since", formatDate(customer.createdAt)],
    ["Last Seen", formatDate(customer.lastSignedIn, true)],
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Customer profile: ${customer.name ?? customer.email}`}
    >
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Customer Profile</h2>
            <Button variant="ghost" onClick={onClose} aria-label="Close profile">
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            {details.map(([label, value]) => (
              <div key={label}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            ))}

            <div className="border-t border-border pt-4 space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <a href={`mailto:${customer.email}`}>
                  <Mail size={16} />
                  Send Email
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => onResetPassword(customer.email)}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Reset Password
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
});