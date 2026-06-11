import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface CancelOrderModalProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function CancelOrderModal({ isOpen, isPending, onClose, onConfirm }: CancelOrderModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title"
    >
      <Card className="w-full max-w-md shadow-2xl border-border overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h3 id="cancel-modal-title" className="text-lg font-bold">Cancel Order</h3>
            <p className="text-sm text-muted-foreground">Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div className="space-y-2">
              <Label htmlFor="cancellationReason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancellationReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Ordered by mistake, found a better price…"
                autoFocus
              />
            </div>
          </div>
          <div className="p-4 bg-muted/40 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Back</Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Cancelling…</>
                : "Confirm Cancellation"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}