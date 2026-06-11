import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DiscountCodeInputProps {
  discountCode: string;
  appliedDiscount: { code: string; amount: number } | null;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onRemove: () => void;
}

export function DiscountCodeInput({
  discountCode,
  appliedDiscount,
  onCodeChange,
  onApply,
  onRemove,
}: DiscountCodeInputProps) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <div className="flex gap-2">
        <Input
          placeholder="Promo code (e.g. WELCOME10)"
          value={discountCode}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          disabled={!!appliedDiscount}
          className="h-10 text-sm"
        />
        <Button
          variant={appliedDiscount ? "destructive" : "secondary"}
          className="h-10 px-4"
          onClick={appliedDiscount ? onRemove : onApply}
        >
          {appliedDiscount ? "Remove" : "Apply"}
        </Button>
      </div>
    </div>
  );
}