import { SavedAddress, ShippingFormData } from "@/types/checkout/checkout.types";

interface SavedAddressesListProps {
  addresses: SavedAddress[];
  onSelectAddress: (address: SavedAddress) => void;
}

export function SavedAddressesList({ addresses, onSelectAddress }: SavedAddressesListProps) {
  if (addresses.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-sm font-medium mb-2">Saved Addresses</p>
      <div className="space-y-2">
        {addresses.map((addr) => (
          <button
            key={addr.id}
            onClick={() => onSelectAddress(addr)}
            className="w-full text-left p-3 rounded-lg border border-border hover:border-[var(--brand)]/50 hover:bg-[var(--brand)]/5 transition-colors text-sm"
          >
            <p className="font-medium">{addr.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {addr.addressLine}, {addr.city}, {addr.country}
            </p>
          </button>
        ))}
      </div>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs text-muted-foreground">
            or enter new address
          </span>
        </div>
      </div>
    </div>
  );
}