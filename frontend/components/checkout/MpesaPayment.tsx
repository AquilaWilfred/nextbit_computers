import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone } from "lucide-react";
import { formatPrice } from "@/lib/cart";

interface MpesaPaymentProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  checkoutId: string | null;
  loading: boolean;
  total: number;
  onInitiate: (phone: string) => void;
  onCancel: () => void;
}

export function MpesaPayment({
  phone,
  onPhoneChange,
  checkoutId,
  loading,
  total,
  onInitiate,
  onCancel,
}: MpesaPaymentProps) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-5 h-5 text-green-600" />
          <p className="font-semibold text-green-700 dark:text-green-400">M-Pesa STK Push</p>
        </div>
        <p className="text-sm text-green-600 dark:text-green-500">
          Enter your M-Pesa phone number. You'll receive a prompt to enter your PIN.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>M-Pesa Phone Number</Label>
        <Input
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+254 712 345 678"
          disabled={!!checkoutId}
        />
      </div>

      {!checkoutId ? (
        <Button
          onClick={() => onInitiate(phone)}
          disabled={loading || !phone}
          className="w-full bg-green-600 text-white hover:bg-green-700 gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          Send STK Push
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <p className="font-medium text-blue-700 dark:text-blue-400">Waiting for Payment...</p>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-500">
              STK push sent to {phone}. Enter your M-Pesa PIN to complete the payment. This page
              will update automatically once payment is confirmed.
            </p>
          </div>
          <Button variant="outline" onClick={onCancel} className="w-full text-xs text-muted-foreground">
            Cancel Payment
          </Button>
        </div>
      )}
    </div>
  );
}