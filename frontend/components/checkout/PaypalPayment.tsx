import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/cart";

interface PaypalPaymentProps {
  paypalOrderId: string | null;
  paypalUrl: string | null;
  loading: boolean;
  total: number;
  onInitiate: () => void;
  onConfirm: (orderId: string) => void;
  onCancel: () => void;
}

export function PaypalPayment({
  paypalOrderId,
  paypalUrl,
  loading,
  total,
  onInitiate,
  onConfirm,
  onCancel,
}: PaypalPaymentProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">PayPal Checkout</p>
        <p className="text-sm text-blue-600 dark:text-blue-500">
          {paypalOrderId
            ? "Please complete the payment in the newly opened window."
            : "You'll be redirected to PayPal to complete your payment securely."}
        </p>
      </div>

      {!paypalOrderId ? (
        <Button
          onClick={onInitiate}
          disabled={loading}
          className="w-full bg-[#003087] text-white hover:bg-[#002070] gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Pay with PayPal — {formatPrice(total)}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
            <p className="font-medium">PayPal Order Created!</p>
            <p className="text-muted-foreground text-xs mt-1">
              Please complete the payment in the popup window. This page will automatically update
              when finished.
            </p>
          </div>

          {paypalUrl && (
            <Button
              onClick={() => window.open(paypalUrl, "PayPal", "width=500,height=750")}
              className="w-full bg-[#003087] text-white hover:bg-[#002070] gap-2 mb-4"
            >
              Open PayPal Window
            </Button>
          )}

          <Button
            onClick={() => onConfirm(paypalOrderId)}
            disabled={loading}
            className="w-full bg-[var(--brand)] text-white hover:opacity-90 gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            I've Completed Payment (Manual Verify)
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground"
          >
            Cancel and try again
          </Button>
        </div>
      )}
    </div>
  );
}