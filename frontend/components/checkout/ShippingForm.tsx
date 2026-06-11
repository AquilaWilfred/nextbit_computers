import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight } from "lucide-react";
import { ShippingFormData } from "@/types/checkout/checkout.types";
import { COUNTRIES } from "@/constants/checkout/checkout.constants";
import { KENYA_COUNTIES } from "@/lib/kenya-locations";
import { formatKenyanPhone } from "@/lib/utils/checkout/checkout.utils";

interface ShippingFormProps {
  shipping: ShippingFormData;
  isAuthenticated: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (updates: Partial<ShippingFormData>) => void;
}

export function ShippingForm({ shipping, isAuthenticated, onSubmit, onChange }: ShippingFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={shipping.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            placeholder="First Name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={shipping.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder="Last Name"
            required
          />
        </div>
      </div>

      {!isAuthenticated && (
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={shipping.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="For order receipts and tracking"
            required
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={shipping.phone}
            onChange={(e) => onChange({ phone: formatKenyanPhone(e.target.value) })}
            placeholder="e.g. +254 112 554 165"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Delivery Address *</Label>
          <Input
            id="address"
            value={shipping.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="e.g. 123 Business Parkway, Suite 200"
            required
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="country">Country *</Label>
          <Select
            value={shipping.country}
            onValueChange={(val) => onChange({ country: val, county: "", city: "" })}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {shipping.country === "Kenya" && (
          <div className="space-y-1.5">
            <Label htmlFor="county">County *</Label>
            <Select
              value={shipping.county}
              onValueChange={(val) => onChange({ county: val, city: "" })}
              required
            >
              <SelectTrigger id="county">
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(KENYA_COUNTIES)
                  .sort()
                  .map((county) => (
                    <SelectItem key={county} value={county}>
                      {county}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city">City / Town *</Label>
          {shipping.country === "Kenya" && shipping.county && KENYA_COUNTIES[shipping.county] ? (
            <Select value={shipping.city} onValueChange={(val) => onChange({ city: val })} required>
              <SelectTrigger id="city">
                <SelectValue placeholder="Select city/town" />
              </SelectTrigger>
              <SelectContent>
                {KENYA_COUNTIES[shipping.county].map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="city"
              value={shipping.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="e.g. Westlands"
              required
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={shipping.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            placeholder="00100"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={shipping.saveAddress}
          onChange={(e) => onChange({ saveAddress: e.target.checked })}
          className="rounded border-input"
        />
        <span className="text-sm text-muted-foreground">
          Save this address for future orders
        </span>
      </label>

      <Button
        type="submit"
        className="w-full bg-[var(--brand)] text-white hover:opacity-90 gap-2 mt-2"
      >
        Continue to Review <ChevronRight className="w-4 h-4" />
      </Button>
    </form>
  );
}