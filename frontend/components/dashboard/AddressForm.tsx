import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddressFormData {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressFormProps {
  isCreating: boolean;
  onSave: (address: AddressFormData) => void;
  onCancel: () => void;
}

export function AddressForm({ isCreating, onSave, onCancel }: AddressFormProps) {
  const [form, setForm] = useState<AddressFormData>({
    fullName: "", phone: "", addressLine: "", city: "", postalCode: "", country: "", isDefault: false,
  });

  const field = (key: keyof AddressFormData, label: string, colSpan?: boolean) => (
    <div className={`space-y-1${colSpan ? " sm:col-span-2" : ""}`}>
      <Label htmlFor={`addr-${key}`}>{label}</Label>
      <Input
        id={`addr-${key}`}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="font-display font-semibold text-sm mb-4">New Address</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {field("fullName", "Full Name")}
        {field("phone", "Phone")}
        {field("addressLine", "Address", true)}
        {field("city", "City")}
        {field("postalCode", "Postal Code")}
        {field("country", "Country", true)}
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          onClick={() => onSave(form)}
          disabled={isCreating}
          className="bg-[var(--brand)] text-white hover:opacity-90"
        >
          {isCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />Saving…</> : "Save"}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}