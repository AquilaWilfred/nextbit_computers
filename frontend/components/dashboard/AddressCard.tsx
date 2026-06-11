import { MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Address } from "@/types/dashboard/dashboard.types";

interface AddressCardProps {
  address: Address;
  onDelete: (id: number) => void;
}

export function AddressCard({ address, onDelete }: AddressCardProps) {
  return (
    <li className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-3">
      <div className="flex gap-3">
        <MapPin className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" aria-hidden="true" />
        <address className="not-italic">
          <p className="font-medium text-sm">{address.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {address.addressLine}, {address.city}{address.postalCode ? `, ${address.postalCode}` : ""}, {address.country}
          </p>
          <p className="text-xs text-muted-foreground">{address.phone}</p>
          {address.isDefault && (
            <Badge className="text-xs mt-1 bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20">Default</Badge>
          )}
        </address>
      </div>
      <button
        onClick={() => onDelete(address.id)}
        className="text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Delete address for ${address.fullName}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}