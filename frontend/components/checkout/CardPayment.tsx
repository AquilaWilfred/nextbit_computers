import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/cart";

interface CardPaymentProps {
  cardData: {
    number: string;
    expiry: string;
    cvv: string;
    firstName: string;
    lastName: string;
  };
  loading: boolean;
  total: number;
  onUpdateCardData: (updates: Partial<any>) => void;
  onProcess: () => void;
  formatCardNumber: (val: string) => string;
  formatExpiry: (val: string) => string;
}

export function CardPayment({
  cardData,
  loading,
  total,
  onUpdateCardData,
  onProcess,
  formatCardNumber,
  formatExpiry,
}: CardPaymentProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>First Name</Label>
          <Input
            value={cardData.firstName}
            onChange={(e) => onUpdateCardData({ firstName: e.target.value })}
            placeholder="First Name"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name</Label>
          <Input
            value={cardData.lastName}
            onChange={(e) => onUpdateCardData({ lastName: e.target.value })}
            placeholder="Last Name"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Card Number</Label>
        <Input
          value={cardData.number}
          onChange={(e) => onUpdateCardData({ number: formatCardNumber(e.target.value) })}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Expiry Date</Label>
          <Input
            value={cardData.expiry}
            onChange={(e) => onUpdateCardData({ expiry: formatExpiry(e.target.value) })}
            placeholder="MM/YY"
            maxLength={5}
          />
        </div>
        <div className="space-y-1.5">
          <Label>CVV</Label>
          <Input
            value={cardData.cvv}
            onChange={(e) =>
              onUpdateCardData({ cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
            placeholder="123"
            maxLength={4}
            type="password"
          />
        </div>
      </div>
      <Button
        onClick={onProcess}
        disabled={
          loading ||
          !cardData.number ||
          !cardData.expiry ||
          !cardData.cvv ||
          !cardData.firstName ||
          !cardData.lastName
        }
        className="w-full bg-[var(--brand)] text-white hover:opacity-90 gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        Pay {formatPrice(total)} Securely
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        🔒 Your payment information is encrypted and secure
      </p>
    </div>
  );
}