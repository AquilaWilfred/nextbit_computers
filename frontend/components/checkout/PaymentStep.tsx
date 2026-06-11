import { PaymentMethod } from "@/types/checkout/checkout.types";
import { formatPrice } from "@/lib/cart";
import { MpesaPayment } from "./MpesaPayment";
import { PaypalPayment } from "./PaypalPayment";
import { CardPayment } from "./CardPayment";
import { useMpesaPayment } from "@/hooks/checkout/useMpesaPayment";
import { usePaypalPayment } from "@/hooks/checkout/usePaypalPayment";
import { useCardPayment } from "@/hooks/checkout/useCardPayments";
import { CreditCard } from "lucide-react";

interface PaymentStepProps {
  orderId: number;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  total: number;
  shippingPhone: string;
  sellerId?: string | null;
  onSuccess: () => void;
}

export function PaymentStep({
  orderId,
  orderNumber,
  paymentMethod,
  total,
  shippingPhone,
  sellerId,
  onSuccess,
}: PaymentStepProps) {
  const mpesa = useMpesaPayment(orderId, total, onSuccess, shippingPhone, sellerId);
  const paypal = usePaypalPayment(orderId, onSuccess);
  const card = useCardPayment(orderId, total, onSuccess);

  // Initialize M-Pesa phone with shipping phone
  // if (mpesa.mpesaPhone === "" && shippingPhone) {
  //   mpesa.setMpesaPhone(shippingPhone);
  // }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-display text-lg font-bold mb-2 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-[var(--brand)]" /> Complete Payment
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Order{" "}
        <span className="font-mono font-medium text-foreground">{orderNumber}</span> — Total:{" "}
        <span className="font-bold">{formatPrice(total)}</span>
      </p>

      {paymentMethod === "mpesa" && (
        <MpesaPayment
          phone={mpesa.mpesaPhone}
          onPhoneChange={mpesa.setMpesaPhone}
          checkoutId={mpesa.mpesaCheckoutId}
          loading={mpesa.loading}
          total={total}
          onInitiate={mpesa.initiatePayment}
          onCancel={mpesa.cancelPayment}
        />
      )}

      {paymentMethod === "paypal" && (
        <PaypalPayment
          paypalOrderId={paypal.paypalOrderId}
          paypalUrl={paypal.paypalUrl}
          loading={paypal.loading}
          total={total}
          onInitiate={paypal.initiatePayment}
          onConfirm={paypal.confirmPayment}
          onCancel={paypal.cancelPayment}
        />
      )}

      {paymentMethod === "stripe" && (
        <CardPayment
          cardData={card.cardData}
          loading={card.loading}
          total={total}
          onUpdateCardData={card.updateCardData}
          onProcess={card.processPayment}
          formatCardNumber={card.formatCardNumber}
          formatExpiry={card.formatExpiry}
        />
      )}
    </div>
  );
}