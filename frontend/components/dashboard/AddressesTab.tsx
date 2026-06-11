import { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Address } from "@/types/dashboard/dashboard.types";
import { AddressCard } from "./AddressCard";
import { AddressForm } from "./AddressForm";
import StoreLoader from "@/components/StoreLoader";

interface AddressesTabProps {
  addresses: Address[];
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  onCreateAddress: (address: Omit<Address, 'id'>) => void;
  onDeleteAddress: (id: number) => void;
}

export function AddressesTab({
  addresses,
  isLoading,
  isCreating,
  isDeleting,
  onCreateAddress,
  onDeleteAddress,
}: AddressesTabProps) {
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Saved Addresses</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-[var(--brand)] text-white hover:opacity-90 gap-1.5">
          <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add Address
        </Button>
      </div>

      {showForm && (
        <AddressForm
          isCreating={isCreating}
          onSave={(address) => {
            onCreateAddress(address);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {addresses.length > 0 ? (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <AddressCard key={addr.id} address={addr} onDelete={onDeleteAddress} />
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-20" aria-hidden="true" />
          <p className="text-sm">No saved addresses yet</p>
        </div>
      )}
    </div>
  );
}